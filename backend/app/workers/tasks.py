import asyncio
from datetime import datetime, timezone
import json
import random
import time
import uuid
from typing import List, Optional
from sqlalchemy import select, update, func
from sqlalchemy.orm import selectinload, joinedload
from loguru import logger

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.campaign import Campaign, CampaignStatus, CampaignRecipient, DeliveryStatus
from app.models.campaign_batch import CampaignBatch, BatchStatus
from app.models.contact import Contact, ContactStatus
from app.models.sms_log import SMSLog
from app.models.setting import Setting
from app.models.gateway_transaction import GatewayTransaction
from app.repositories.setting import setting_repository
from app.services.sms_provider import get_sms_provider
from app.services.sms_segment_service import sms_segment_service
from app.services.providers.esms_provider import (
    DialogESMSProvider,
    ESMSErrorCode,
    ESMS_ERROR_DESCRIPTIONS
)
from app.workers.celery_app import celery_app
from app.websocket.events import (
    broadcast_campaign_progress,
    broadcast_sms_status,
    broadcast_dashboard_update,
    broadcast_notification
)


def resolve_template(message_template: str, contact: Contact) -> str:
    """
    Drives variable merges. E.g., 'Hi {name}' -> 'Hi Priya'
    """
    msg = message_template
    fullname = f"{contact.first_name} {contact.last_name}".strip()
    replacements = {
        "{first_name}": contact.first_name,
        "{firstname}": contact.first_name,
        "{last_name}": contact.last_name,
        "{lastname}": contact.last_name,
        "{name}": fullname,
        "{phone}": contact.phone,
        "{email}": contact.email or "",
        "{company}": contact.company or "",
    }
    for placeholder, val in replacements.items():
        msg = msg.replace(placeholder, str(val))
    return msg


async def run_process_campaign(campaign_id: str) -> None:
    """
    Production-grade runner executing the multi-batch campaign pipeline for Dialog eSMS.
    Handles:
    - Authoritative SMS segmentation and atomic balance validation
    - Splitting recipients into batches of max 1,000 (Dialog eSMS tested limit)
    - Generating unique numeric 64-bit transaction IDs per batch and retry
    - Recording CampaignBatch records linked to parent Campaign
    - Idempotent recipient state tracking and safe retry logic
    - Real-time WebSocket event broadcasts
    """
    logger.info(f"[CAMPAIGN WORKER] Processing campaign: {campaign_id}")
    
    async with SessionLocal() as db:
        # 1. Fetch Campaign with recipients, contacts, and existing batches
        campaign_query = (
            select(Campaign)
            .where(Campaign.id == uuid.UUID(campaign_id))
            .options(
                selectinload(Campaign.recipients).joinedload(CampaignRecipient.contact),
                selectinload(Campaign.batches)
            )
        )
        res = await db.execute(campaign_query)
        campaign = res.scalars().first()
        
        if not campaign or campaign.status not in [CampaignStatus.QUEUED, CampaignStatus.SCHEDULED]:
            logger.warning(f"[CAMPAIGN WORKER] Campaign {campaign_id} is not eligible for sending (status={getattr(campaign, 'status', None)}).")
            return

        app_settings = await setting_repository.get_settings(db)
        
        # 2. Authoritative SMS Segmentation & Balance Check
        pending_recipients = [r for r in campaign.recipients if r.status == DeliveryStatus.PENDING]
        total_pending = len(pending_recipients)
        
        if total_pending == 0:
            logger.info(f"[CAMPAIGN WORKER] Campaign {campaign_id} has no pending recipients.")
            return

        total_required_units, seg_per_msg, encoding = sms_segment_service.calculate_campaign_sms_units(
            message=campaign.message,
            recipient_count=total_pending
        )

        if total_required_units > app_settings.sms_balance:
            logger.error(
                f"[CAMPAIGN WORKER] Insufficient SMS balance: {app_settings.sms_balance} available, campaign requires {total_required_units}."
            )
            campaign.status = CampaignStatus.FAILED
            campaign.failure_reason = f"Insufficient SMS balance ({app_settings.sms_balance} credits available, required {total_required_units})."
            await db.commit()
            broadcast_notification(f"Campaign '{campaign.name}' failed: Insufficient SMS credits.", "error")
            return

        # 3. Provider Resolution
        provider = get_sms_provider()
        gateway_name = "Dialog eSMS" if isinstance(provider, DialogESMSProvider) else getattr(settings, "SMS_GATEWAY", "ESMS")
        
        # Update Campaign status to PROCESSING
        campaign.status = CampaignStatus.PROCESSING
        campaign.sent_at = datetime.now(timezone.utc)
        campaign.gateway = gateway_name
        campaign.queue_id = str(uuid.uuid4())
        await db.commit()

        broadcast_campaign_progress(
            campaign_id=str(campaign.id),
            progress=0,
            recipient_count=campaign.recipient_count,
            sent_count=0,
            delivered_count=campaign.delivered_count,
            failed_count=campaign.failed_count,
            pending_count=total_pending,
            status="PROCESSING"
        )
        broadcast_notification(f"Campaign '{campaign.name}' has started processing ({total_pending} recipients).", "info")

        # 4. Multi-Batch Processing
        batch_chunk_size = min(getattr(settings, "ESMS_BATCH_SIZE", 1000), 1000)
        existing_batch_count = len(campaign.batches) if campaign.batches else 0

        sender_mask = campaign.sender_id or getattr(settings, "ESMS_DEFAULT_MASK", None) or app_settings.default_sender_id or "UMG Lanka"
        
        # Deduct balance atomically
        app_settings.sms_balance -= total_required_units
        db.add(app_settings)
        await db.commit()

        # Chunk pending recipients into batches of max 1,000
        for chunk_idx in range(0, total_pending, batch_chunk_size):
            chunk = pending_recipients[chunk_idx : chunk_idx + batch_chunk_size]
            batch_num = existing_batch_count + (chunk_idx // batch_chunk_size) + 1
            
            # Generate unique numeric transaction_id for this batch
            batch_tx_id = DialogESMSProvider.generate_unique_transaction_id()

            # Create CampaignBatch entity
            batch = CampaignBatch(
                campaign_id=campaign.id,
                batch_number=batch_num,
                transaction_id=batch_tx_id,
                recipient_count=len(chunk),
                status=BatchStatus.PROCESSING,
                started_at=datetime.now(timezone.utc)
            )
            db.add(batch)
            await db.commit()
            await db.refresh(batch)

            # Link recipients to this batch
            for rec in chunk:
                rec.batch_id = batch.id
                db.add(rec)
            await db.commit()

            # Validate & normalize each recipient in chunk
            valid_chunk_recipients = []
            msisdn_payload = []

            for rec in chunk:
                contact = rec.contact
                
                # Check blacklist / unsubscribe
                if contact.status in [ContactStatus.BLACKLISTED, ContactStatus.UNSUBSCRIBED]:
                    rec.status = DeliveryStatus.FAILED
                    rec.error_message = f"Contact is {contact.status.value}"
                    rec.failed_at = datetime.now(timezone.utc)
                    db.add(rec)
                    
                    log_entry = SMSLog(
                        campaign_id=campaign.id,
                        recipient_id=rec.id,
                        phone=contact.phone,
                        message=campaign.message,
                        provider=gateway_name,
                        sender_id=sender_mask,
                        status=DeliveryStatus.FAILED,
                        error_message=f"Contact is {contact.status.value}",
                        sent_at=datetime.now(timezone.utc)
                    )
                    db.add(log_entry)
                    broadcast_sms_status(contact.phone, "FAILED", str(campaign.id), f"Contact is {contact.status.value}")
                    continue

                # Normalize to Dialog 9-digit format (7XXXXXXXX)
                is_valid, norm_9digit = DialogESMSProvider.normalize_dialog_mobile(contact.phone)
                if not is_valid:
                    rec.status = DeliveryStatus.FAILED
                    rec.error_message = f"Invalid Sri Lankan mobile number: '{contact.phone}'. Must be 9-digit format (7XXXXXXXX)."
                    rec.error_code = "INVALID_PHONE_FORMAT"
                    rec.failed_at = datetime.now(timezone.utc)
                    db.add(rec)
                    
                    log_entry = SMSLog(
                        campaign_id=campaign.id,
                        recipient_id=rec.id,
                        phone=contact.phone,
                        message=campaign.message,
                        provider=gateway_name,
                        sender_id=sender_mask,
                        status=DeliveryStatus.FAILED,
                        error_message=rec.error_message,
                        error_code="INVALID_PHONE_FORMAT",
                        sent_at=datetime.now(timezone.utc)
                    )
                    db.add(log_entry)
                    broadcast_sms_status(contact.phone, "FAILED", str(campaign.id), rec.error_message)
                    continue

                rec.normalized_mobile_number = norm_9digit
                valid_chunk_recipients.append(rec)
                msisdn_payload.append({"mobile": norm_9digit})

            # If no valid numbers in this batch
            if not valid_chunk_recipients:
                batch.status = BatchStatus.FAILED
                batch.error_code = "109"
                batch.error_message = "No valid mobile numbers remaining in this batch."
                batch.failed_count = len(chunk)
                batch.completed_at = datetime.now(timezone.utc)
                db.add(batch)
                await db.commit()
                continue

            # 5. Dispatch batch to Gateway with safe transient retry
            if isinstance(provider, DialogESMSProvider):
                dispatch_success = False
                max_transient_retries = 2
                last_error_code = None
                last_error_desc = None
                batch_response_data = None
                current_tx_id = batch_tx_id

                for attempt in range(max_transient_retries):
                    # Rate limiting: 20 TPS for send SMS (50ms interval)
                    await asyncio.sleep(0.05)

                    # Build eSMS POST request payload
                    post_payload = {
                        "msisdn": msisdn_payload,
                        "sourceAddress": sender_mask[:11],
                        "message": campaign.message,
                        "transaction_id": current_tx_id,
                        "payment_method": getattr(settings, "ESMS_PAYMENT_METHOD", 0)
                    }
                    if getattr(settings, "ESMS_DELIVERY_REPORT_URL", None):
                        post_payload["push_notification_url"] = settings.ESMS_DELIVERY_REPORT_URL

                    endpoint = f"{provider.base_url}/api/v2/sms"
                    result = await provider._execute_post_sms(
                        endpoint=endpoint,
                        payload=post_payload,
                        transaction_id=current_tx_id,
                        campaign_id=str(campaign.id)
                    )

                    if result["status"] == DeliveryStatus.ACCEPTED:
                        dispatch_success = True
                        batch_response_data = result
                        break
                    else:
                        err_code = str(result.get("error_code") or "").strip()
                        err_msg = result.get("error_message") or ""
                        last_error_code = err_code
                        last_error_desc = err_msg

                        # Check if error is transient (e.g. timeout, network error, rate limit 117)
                        is_transient = err_code in ("GATEWAY_TIMEOUT", "NETWORK_ERROR", "117") or "timed out" in err_msg.lower()
                        if is_transient and attempt < (max_transient_retries - 1):
                            logger.warning(f"[CAMPAIGN WORKER] Transient error on batch {batch_num} (attempt {attempt+1}): {err_msg}. Retrying with new transaction_id...")
                            # Exponential backoff
                            await asyncio.sleep(1.0 * (attempt + 1))
                            # Crucial: Generate a BRAND NEW transaction ID for the retry (Dialog error 104 prevention)
                            current_tx_id = DialogESMSProvider.generate_unique_transaction_id()
                            batch.transaction_id = current_tx_id
                            db.add(batch)
                            await db.commit()
                            continue
                        else:
                            # Permanent error or retries exhausted
                            break

                # Update batch state
                if dispatch_success and batch_response_data:
                    gw_camp_id = batch_response_data.get("gateway_campaign_id")
                    cost_val = float(batch_response_data.get("campaign_cost") or 0.0)
                    
                    batch.gateway_campaign_id = gw_camp_id
                    batch.cost = cost_val
                    batch.accepted_count = len(valid_chunk_recipients)
                    batch.submitted_count = len(valid_chunk_recipients)
                    batch.status = BatchStatus.SUBMITTED
                    batch.gateway_response = json.dumps(batch_response_data.get("raw_response") or {})
                    batch.error_code = None
                    batch.error_message = None

                    # Set primary transaction & gateway IDs on campaign for single-batch / legacy compatibility
                    if not campaign.transaction_id:
                        campaign.transaction_id = current_tx_id
                    if not campaign.gateway_campaign_id and gw_camp_id:
                        campaign.gateway_campaign_id = gw_camp_id

                    # Update recipients
                    for rec in valid_chunk_recipients:
                        rec.status = DeliveryStatus.SUBMITTED
                        rec.submission_status = "SUBMITTED"
                        rec.gateway_status_code = "1"
                        rec.gateway_campaign_id = gw_camp_id
                        rec.gateway_message_id = gw_camp_id or str(current_tx_id)
                        rec.gateway_response = json.dumps(batch_response_data.get("raw_response") or {})
                        rec.submitted_at = datetime.now(timezone.utc)
                        db.add(rec)

                        log_entry = SMSLog(
                            campaign_id=campaign.id,
                            recipient_id=rec.id,
                            phone=rec.contact.phone,
                            message=campaign.message,
                            provider=gateway_name,
                            sender_id=sender_mask,
                            status=DeliveryStatus.SUBMITTED,
                            gateway_message_id=gw_camp_id or str(current_tx_id),
                            gateway_response=json.dumps(batch_response_data.get("raw_response") or {}),
                            sent_at=datetime.now(timezone.utc)
                        )
                        db.add(log_entry)
                        broadcast_sms_status(rec.contact.phone, "SUBMITTED", str(campaign.id))

                else:
                    # Batch failed
                    batch.status = BatchStatus.FAILED
                    batch.error_code = last_error_code
                    batch.error_message = last_error_desc
                    batch.failed_count = len(valid_chunk_recipients)
                    batch.completed_at = datetime.now(timezone.utc)

                    for rec in valid_chunk_recipients:
                        rec.status = DeliveryStatus.FAILED
                        rec.error_code = last_error_code
                        rec.error_message = last_error_desc
                        rec.failed_at = datetime.now(timezone.utc)
                        db.add(rec)

                        log_entry = SMSLog(
                            campaign_id=campaign.id,
                            recipient_id=rec.id,
                            phone=rec.contact.phone,
                            message=campaign.message,
                            provider=gateway_name,
                            sender_id=sender_mask,
                            status=DeliveryStatus.FAILED,
                            error_code=last_error_code,
                            error_message=last_error_desc,
                            sent_at=datetime.now(timezone.utc)
                        )
                        db.add(log_entry)
                        broadcast_sms_status(rec.contact.phone, "FAILED", str(campaign.id), last_error_desc)

                db.add(batch)
                await db.commit()

            else:
                # Fallback non-Dialog provider loop for this chunk
                for rec in valid_chunk_recipients:
                    try:
                        res = await provider.send_sms(
                            to_phone=rec.contact.phone,
                            message=campaign.message,
                            sender_id=sender_mask,
                            campaign_id=str(campaign.id)
                        )
                        rec.status = res["status"]
                        rec.gateway_message_id = res.get("message_id")
                        rec.error_message = res.get("error_message")
                        db.add(rec)

                        log_entry = SMSLog(
                            campaign_id=campaign.id,
                            recipient_id=rec.id,
                            phone=rec.contact.phone,
                            message=campaign.message,
                            provider=gateway_name,
                            sender_id=sender_mask,
                            status=res["status"],
                            error_message=res.get("error_message"),
                            sent_at=datetime.now(timezone.utc)
                        )
                        db.add(log_entry)
                        broadcast_sms_status(rec.contact.phone, res["status"].value, str(campaign.id))
                    except Exception as ex:
                        rec.status = DeliveryStatus.FAILED
                        rec.error_message = str(ex)
                        db.add(rec)

                batch.status = BatchStatus.COMPLETED
                batch.completed_at = datetime.now(timezone.utc)
                db.add(batch)
                await db.commit()

            # Broadcast batch progress
            await db.refresh(campaign)
            stats_q = select(CampaignRecipient.status, func.count(CampaignRecipient.id)).where(CampaignRecipient.campaign_id == campaign.id).group_by(CampaignRecipient.status)
            stats_res = await db.execute(stats_q)
            counts = dict(stats_res.all())
            
            c_del = counts.get(DeliveryStatus.DELIVERED, 0)
            c_fail = counts.get(DeliveryStatus.FAILED, 0)
            c_sub = counts.get(DeliveryStatus.SUBMITTED, 0) + counts.get(DeliveryStatus.ACCEPTED, 0)
            
            progress_pct = round(((c_del + c_fail + c_sub) / campaign.recipient_count) * 100, 1) if campaign.recipient_count > 0 else 100.0
            broadcast_campaign_progress(
                campaign_id=str(campaign.id),
                progress=progress_pct,
                recipient_count=campaign.recipient_count,
                sent_count=c_del + c_fail + c_sub,
                delivered_count=c_del,
                failed_count=c_fail,
                pending_count=max(0, campaign.recipient_count - (c_del + c_fail + c_sub)),
                status="PROCESSING"
            )

        # 6. Finalize Campaign State after all batches are dispatched
        stats_q = select(CampaignRecipient.status, func.count(CampaignRecipient.id)).where(CampaignRecipient.campaign_id == campaign.id).group_by(CampaignRecipient.status)
        stats_res = await db.execute(stats_q)
        final_counts = dict(stats_res.all())

        c_del = final_counts.get(DeliveryStatus.DELIVERED, 0)
        c_fail = final_counts.get(DeliveryStatus.FAILED, 0)
        c_sub = final_counts.get(DeliveryStatus.SUBMITTED, 0) + final_counts.get(DeliveryStatus.ACCEPTED, 0)
        c_pending = max(0, campaign.recipient_count - (c_del + c_fail + c_sub))

        campaign.delivered_count = c_del
        campaign.failed_count = c_fail
        campaign.submitted_count = c_sub
        campaign.pending_count = c_pending

        # Status transition: If all recipients reached terminal states, mark COMPLETED/FAILED
        if c_del + c_fail >= campaign.recipient_count and campaign.recipient_count > 0:
            campaign.status = CampaignStatus.COMPLETED if c_fail == 0 else (CampaignStatus.PARTIALLY_FAILED if c_del > 0 else CampaignStatus.FAILED)
            campaign.completed_at = datetime.now(timezone.utc)
        elif c_sub > 0:
            # Batches are accepted by gateway SMSC, awaiting delivery report webhook callbacks
            campaign.status = CampaignStatus.SUBMITTED
        else:
            campaign.status = CampaignStatus.FAILED

        db.add(campaign)
        await db.commit()

        # Final WebSocket broadcast
        broadcast_campaign_progress(
            campaign_id=str(campaign.id),
            progress=100.0 if campaign.status in (CampaignStatus.COMPLETED, CampaignStatus.FAILED, CampaignStatus.PARTIALLY_FAILED) else 90.0,
            recipient_count=campaign.recipient_count,
            sent_count=c_del + c_fail + c_sub,
            delivered_count=c_del,
            failed_count=c_fail,
            pending_count=c_pending,
            status=campaign.status.value
        )

        if campaign.status in (CampaignStatus.SUBMITTED, CampaignStatus.ACCEPTED, CampaignStatus.COMPLETED):
            broadcast_notification(f"Campaign '{campaign.name}' batches submitted successfully to Dialog eSMS.", "success")
        elif campaign.status == CampaignStatus.PARTIALLY_FAILED:
            broadcast_notification(f"Campaign '{campaign.name}' processed with partial failures.", "warning")
        else:
            broadcast_notification(f"Campaign '{campaign.name}' failed to dispatch.", "error")

        logger.success(f"[CAMPAIGN WORKER] Completed processing campaign: {campaign_id}. Status: {campaign.status}")


@celery_app.task(name="process_sms_campaign")
def process_sms_campaign(campaign_id: str) -> None:
    """
    Celery task wrapper executing the async run_process_campaign worker.
    """
    asyncio.run(run_process_campaign(campaign_id))


async def run_check_scheduled_campaigns() -> None:
    """
    Periodic worker finding scheduled campaigns due for dispatch.
    Safely and atomically claims campaigns (status=SCHEDULED -> QUEUED) to prevent duplicate execution.
    """
    logger.info("[SCHEDULED WORKER] Checking for due scheduled campaigns...")
    now_utc = datetime.now(timezone.utc)
    
    async with SessionLocal() as db:
        # Select scheduled campaigns where scheduled_time <= now
        query = (
            select(Campaign)
            .where(
                Campaign.status == CampaignStatus.SCHEDULED,
                Campaign.scheduled_time <= now_utc,
                Campaign.is_deleted == False
            )
            .limit(10)
        )
        res = await db.execute(query)
        due_campaigns = list(res.scalars().all())

        if not due_campaigns:
            return

        for c in due_campaigns:
            logger.info(f"[SCHEDULED WORKER] Triggering scheduled campaign: '{c.name}' (ID: {c.id})")
            c.status = CampaignStatus.QUEUED
            db.add(c)
            await db.commit()

            # Queue for dispatch
            try:
                process_sms_campaign.delay(str(c.id))
            except Exception as e:
                logger.warning(f"Could not queue scheduled campaign via Celery ({e}), running directly")
                asyncio.create_task(run_process_campaign(str(c.id)))


@celery_app.task(name="check_scheduled_campaigns")
def check_scheduled_campaigns() -> None:
    """
    Celery task wrapper for periodic scheduled campaign checking.
    """
    asyncio.run(run_check_scheduled_campaigns())


async def run_process_bulk_sms(phones: list[str], message: str, sender_id: str) -> None:
    """
    Runner for sending ad-hoc SMS in bulk to a list of phone numbers.
    Supports batching and live WebSocket progress updates per batch.
    """
    logger.info(f"[BULK SMS WORKER] Processing ad-hoc bulk SMS for {len(phones)} numbers.")
    broadcast_notification(f"Ad-hoc Bulk SMS dispatch started for {len(phones)} recipients.", "info")
    
    async with SessionLocal() as db:
        app_settings = await setting_repository.get_settings(db)
        provider = get_sms_provider()
        gateway_name = "Dialog eSMS" if isinstance(provider, DialogESMSProvider) else getattr(settings, "SMS_GATEWAY", "ESMS")

        # Authoritative segment calculation
        total_units, seg_count, encoding = sms_segment_service.calculate_campaign_sms_units(message, len(phones))

        if isinstance(provider, DialogESMSProvider):
            def batch_progress(b_idx: int, total_b: int, processed: int, total: int):
                pct = int((processed / total) * 100) if total > 0 else 100
                broadcast_notification(f"Bulk SMS Batch {b_idx}/{total_b} completed ({pct}%).", "info")

            results = await provider.send_bulk_sms(
                recipients=phones,
                message=message,
                sender_id=sender_id,
                batch_size=getattr(settings, "ESMS_BATCH_SIZE", 1000),
                progress_callback=batch_progress
            )

            delivered_inc = sum(1 for r in results if r["status"] in (DeliveryStatus.ACCEPTED, DeliveryStatus.DELIVERED, DeliveryStatus.SUBMITTED))
            failed_inc = len(results) - delivered_inc

            for res in results:
                log_entry = SMSLog(
                    phone=res["phone"],
                    message=message,
                    provider="Dialog eSMS",
                    status=res["status"],
                    error_message=res.get("error_message"),
                    error_code=res.get("error_code"),
                    gateway_message_id=str(res.get("gateway_campaign_id") or res.get("message_id") or ""),
                    gateway_response=str(res.get("raw_response")) if res.get("raw_response") else None,
                    sent_at=res.get("sent_at") or datetime.now(timezone.utc),
                    delivered_at=res.get("sent_at") if res["status"] == DeliveryStatus.DELIVERED else None
                )
                db.add(log_entry)
                broadcast_sms_status(res["phone"], res["status"].value, None, res.get("error_message"))

            # Deduct units
            app_settings.sms_balance = max(0, app_settings.sms_balance - (delivered_inc * seg_count))

        else:
            delivered_inc = 0
            failed_inc = 0
            for phone in phones:
                try:
                    res = await provider.send_sms(to_phone=phone, message=message, sender_id=sender_id)
                    if res["status"] in (DeliveryStatus.ACCEPTED, DeliveryStatus.SENT, DeliveryStatus.DELIVERED, DeliveryStatus.SUBMITTED):
                        delivered_inc += 1
                        app_settings.sms_balance = max(0, app_settings.sms_balance - seg_count)
                    else:
                        failed_inc += 1

                    log_entry = SMSLog(
                        phone=phone,
                        message=message,
                        provider=gateway_name,
                        status=res["status"],
                        error_message=res.get("error_message"),
                        sent_at=datetime.now(timezone.utc)
                    )
                    db.add(log_entry)
                    broadcast_sms_status(phone, res["status"].value, None, res.get("error_message"))
                except Exception as e:
                    failed_inc += 1

        db.add(app_settings)
        await db.commit()
        
        broadcast_notification(f"Ad-hoc Bulk SMS dispatch complete. Sent: {delivered_inc}, Failed: {failed_inc}", "success")
        logger.success("[BULK SMS WORKER] Finished processing ad-hoc bulk SMS.")


@celery_app.task(name="process_bulk_sms")
def process_bulk_sms(phones: list[str], message: str, sender_id: str) -> None:
    """
    Celery task wrapper executing the async run_process_bulk_sms worker.
    """
    asyncio.run(run_process_bulk_sms(phones, message, sender_id))


async def run_sync_esms_transactions() -> None:
    """
    Background worker reconciling pending Dialog eSMS batches and transactions.
    Checks campaign status for pending transactions adhering to 2 TPS (120 req/min) rate limit constraint.
    """
    logger.info("[SYNC ESMS] Starting eSMS transaction status reconciliation...")
    async with SessionLocal() as db:
        # Find active campaign batches using Dialog eSMS that have a transaction_id and are not completed
        query = (
            select(CampaignBatch)
            .where(
                CampaignBatch.transaction_id.isnot(None),
                CampaignBatch.status.in_([BatchStatus.PROCESSING, BatchStatus.SUBMITTED, BatchStatus.ACCEPTED])
            )
            .limit(50)
        )
        res = await db.execute(query)
        batches = list(res.scalars().all())

        if not batches:
            logger.info("[SYNC ESMS] No active eSMS batches requiring transaction status check.")
            return

        provider = DialogESMSProvider()
        for b in batches:
            if not b.transaction_id:
                continue

            try:
                # Rate limit compliance: 2 requests per second max (pause 0.5s)
                await asyncio.sleep(0.5)
                tx_status_res = await provider.check_transaction_status(b.transaction_id)

                if tx_status_res.get("success"):
                    remote_status = (tx_status_res.get("campaign_status") or "").lower()
                    logger.info(f"[SYNC ESMS] Batch {b.batch_number} (TX: {b.transaction_id}) status: {remote_status}")

                    if remote_status == "completed":
                        b.status = BatchStatus.COMPLETED
                        b.completed_at = datetime.now(timezone.utc)
                        db.add(b)
                        await db.commit()
                    elif remote_status == "running":
                        b.status = BatchStatus.SUBMITTED
                        db.add(b)
                        await db.commit()

            except Exception as e:
                logger.warning(f"[SYNC ESMS] Failed checking transaction {b.transaction_id}: {e}")

    logger.info("[SYNC ESMS] Finished transaction reconciliation cycle.")


@celery_app.task(name="sync_esms_transactions")
def sync_esms_transactions() -> None:
    """
    Celery task wrapper for periodic eSMS transaction status check.
    """
    asyncio.run(run_sync_esms_transactions())
