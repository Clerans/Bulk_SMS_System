import asyncio
from datetime import datetime, timezone
import uuid
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from loguru import logger

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.campaign import Campaign, CampaignStatus, CampaignRecipient, DeliveryStatus
from app.models.contact import Contact, ContactStatus
from app.models.sms_log import SMSLog
from app.models.setting import Setting
from app.repositories.setting import setting_repository
from app.services.sms_provider import MockSMSProvider, TwilioSMSProvider
from app.services.providers.smslenz_provider import SMSLenzProvider
from app.services.providers.notify_provider import NotifySMSProvider
from app.workers.celery_app import celery_app

# Import WebSocket event publisher utilities
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
    Asynchronous runner executing the campaign pipeline.
    """
    logger.info(f"Worker processing campaign: {campaign_id}")
    
    async with SessionLocal() as db:
        # 1. Fetch Campaign with recipients and contacts
        campaign_query = (
            select(Campaign)
            .where(Campaign.id == uuid.UUID(campaign_id))
            .options(
                selectinload(Campaign.recipients).selectinload(CampaignRecipient.contact)
            )
        )
        res = await db.execute(campaign_query)
        campaign = res.scalars().first()
        
        if not campaign or campaign.status not in [CampaignStatus.QUEUED, CampaignStatus.SCHEDULED]:
            logger.warning(f"Campaign {campaign_id} not eligible for sending.")
            return

        # Fetch settings for gateway configurations
        app_settings = await setting_repository.get_settings(db)
        
        # 2. Insufficient Balance Check
        recipients = campaign.recipients
        pending_recipients = [r for r in recipients if r.status == DeliveryStatus.PENDING]
        
        if len(pending_recipients) > app_settings.sms_balance:
            logger.error(f"Insufficient SMS balance: {app_settings.sms_balance} credits left, campaign requires {len(pending_recipients)}")
            campaign.status = CampaignStatus.FAILED
            await db.commit()
            return

        # 3. Gateway Selection Strategy: SMS_GATEWAY env var / SMSLENZ credentials -> DB Setting -> Fallback
        gw_name = (getattr(settings, "SMS_GATEWAY", None) or app_settings.gateway or "SMSLENZ").upper()

        if gw_name == "NOTIFY" or (getattr(settings, "NOTIFY_USER_ID", None) and getattr(settings, "NOTIFY_API_KEY", None)):
            provider = NotifySMSProvider(
                user_id=getattr(settings, "NOTIFY_USER_ID", None) or app_settings.api_key,
                api_key=getattr(settings, "NOTIFY_API_KEY", None) or app_settings.api_secret,
                sender_id=getattr(settings, "NOTIFY_SENDER_ID", None) or app_settings.sender_id or "NotifyDEMO"
            )
            logger.info(f"[CAMPAIGN WORKER] Selected Provider: NotifySMSProvider | Gateway: NOTIFY | Campaign ID: {campaign.id}")
            print(f"[CAMPAIGN WORKER] Selected Provider: NotifySMSProvider | Gateway: NOTIFY | Campaign ID: {campaign.id}")
        elif gw_name == "SMSLENZ" or (settings.SMSLENZ_USER_ID and settings.SMSLENZ_API_KEY):
            provider = SMSLenzProvider(
                user_id=settings.SMSLENZ_USER_ID or app_settings.api_key,
                api_key=settings.SMSLENZ_API_KEY or app_settings.api_secret,
                sender_id=settings.SMSLENZ_SENDER_ID or app_settings.sender_id or "CAFECHAI"
            )
            logger.info(f"[CAMPAIGN WORKER] Selected Provider: SMSLenzProvider | Gateway: SMSLENZ | Campaign ID: {campaign.id}")
            print(f"[CAMPAIGN WORKER] Selected Provider: SMSLenzProvider | Gateway: SMSLENZ | Campaign ID: {campaign.id}")
        elif gw_name == "TWILIO" and app_settings.api_key and app_settings.api_secret:
            provider = TwilioSMSProvider(app_settings.api_key, app_settings.api_secret)
            logger.info(f"[CAMPAIGN WORKER] Selected Provider: TwilioSMSProvider | Gateway: TWILIO | Campaign ID: {campaign.id}")
        else:
            provider = MockSMSProvider()
            logger.warning(f"[CAMPAIGN WORKER] Selected Provider: MockSMSProvider | Gateway: MOCK | Campaign ID: {campaign.id}")

        # Update status & metadata
        campaign.status = CampaignStatus.PROCESSING
        campaign.sent_at = datetime.now(timezone.utc)
        gateway_name = "Notify.lk" if isinstance(provider, NotifySMSProvider) else ("SMSlenz" if isinstance(provider, SMSLenzProvider) else "MOCK")
        campaign.gateway = gateway_name
        try:
            campaign.queue_id = str(self.request.id) if self.request and self.request.id else str(uuid.uuid4())
        except Exception:
            campaign.queue_id = str(uuid.uuid4())
        await db.commit()

        # Broadcast start events
        total_recipients = len(pending_recipients)
        broadcast_campaign_progress(
            campaign_id=str(campaign.id),
            progress=0,
            recipient_count=total_recipients,
            sent_count=0,
            delivered_count=0,
            failed_count=0,
            pending_count=total_recipients,
            status="PROCESSING"
        )
        broadcast_notification(f"Campaign '{campaign.name}' has started processing.", "info")

        delivered_inc = 0
        failed_inc = 0

        # 4. Dispatch Loop
        processed_count = 0
        
        for rec in pending_recipients:
            contact = rec.contact
            processed_count += 1
            
            # Skip blacklisted/unsubscribed subscribers immediately
            if contact.status in [ContactStatus.BLACKLISTED, ContactStatus.UNSUBSCRIBED]:
                rec.status = DeliveryStatus.FAILED
                rec.error_message = f"Contact is {contact.status.value}"
                failed_inc += 1
                
                # Add individual log entry
                log_entry = SMSLog(
                    campaign_id=campaign.id,
                    recipient_id=rec.id,
                    phone=contact.phone,
                    message=campaign.message,
                    provider=gateway_name,
                    sender_id=campaign.sender_id,
                    route=campaign.route,
                    status=DeliveryStatus.FAILED,
                    error_message=f"Contact is {contact.status.value}"
                )
                db.add(log_entry)
                
                # Broadcast sms status
                broadcast_sms_status(contact.phone, "FAILED", str(campaign.id), f"Contact is {contact.status.value}")
                continue

            # Merge templates
            personalized_msg = resolve_template(campaign.message, contact)

            # Send via provider strategy
            try:
                res = await provider.send_sms(
                    to_phone=contact.phone,
                    message=personalized_msg,
                    sender_id=campaign.sender_id,
                    campaign_id=str(campaign.id)
                )
                
                # Update recipient status
                rec.status = res["status"]
                safe_err_msg = res["error_message"][:245] if res.get("error_message") else None
                rec.error_message = safe_err_msg
                rec.gateway_message_id = res.get("message_id")
                rec.gateway_response = str(res.get("raw_response")) if res.get("raw_response") else None
                
                if res["status"] in [DeliveryStatus.ACCEPTED, DeliveryStatus.SENT, DeliveryStatus.DELIVERED]:
                    delivered_inc += 1
                    if res.get("sms_credit_balance") is not None:
                        app_settings.sms_balance = int(float(res["sms_credit_balance"]))
                    else:
                        app_settings.sms_balance -= 1
                else:
                    failed_inc += 1
                    
                # Add log entry
                log_entry = SMSLog(
                    campaign_id=campaign.id,
                    recipient_id=rec.id,
                    phone=contact.phone,
                    message=personalized_msg,
                    provider=gateway_name,
                    sender_id=campaign.sender_id,
                    route=campaign.route,
                    gateway_message_id=res.get("message_id"),
                    gateway_response=str(res.get("raw_response")) if res.get("raw_response") else None,
                    status=res["status"],
                    error_message=safe_err_msg,
                    sent_at=res["sent_at"],
                    delivered_at=res["sent_at"] if res["status"] == DeliveryStatus.DELIVERED else None
                )
                db.add(log_entry)
                
                # Broadcast sms status
                broadcast_sms_status(contact.phone, res["status"].value, str(campaign.id), res["error_message"])
                
                # Set last campaign on contact
                contact.last_campaign = campaign.name
                db.add(contact)
                
            except Exception as ex:
                logger.error(f"Error sending SMS to {contact.phone}: {str(ex)}")
                rec.status = DeliveryStatus.FAILED
                rec.error_message = str(ex)[:245]
                failed_inc += 1
                
                log_entry = SMSLog(
                    campaign_id=campaign.id,
                    recipient_id=rec.id,
                    phone=contact.phone,
                    message=personalized_msg,
                    provider=gateway_name,
                    sender_id=campaign.sender_id,
                    route=campaign.route,
                    status=DeliveryStatus.FAILED,
                    error_message=str(ex)[:245]
                )
                db.add(log_entry)
                
                # Broadcast sms status
                broadcast_sms_status(contact.phone, "FAILED", str(campaign.id), str(ex))

            # Commit periodically for real-time progress update
            await db.commit()
            
            # Broadcast campaign progress and dashboard stats
            progress_pct = round((processed_count / total_recipients) * 100, 1) if total_recipients > 0 else 100.0
            broadcast_campaign_progress(
                campaign_id=str(campaign.id),
                progress=progress_pct,
                recipient_count=total_recipients,
                sent_count=processed_count,
                delivered_count=delivered_inc,
                failed_count=failed_inc,
                pending_count=total_recipients - processed_count,
                status="PROCESSING"
            )
            broadcast_dashboard_update(
                today=delivered_inc + failed_inc,
                failed=failed_inc,
                queued=total_recipients - processed_count
            )

        # 5. Finalize Campaign Stats & Account Balance Sync
        campaign.delivered_count = delivered_inc
        campaign.failed_count = failed_inc
        campaign.pending_count = len(recipients) - (delivered_inc + failed_inc)
        
        if failed_inc == len(recipients):
            campaign.status = CampaignStatus.FAILED
        elif failed_inc > 0:
            campaign.status = CampaignStatus.PARTIALLY_FAILED
        else:
            # SMSlenz API response confirms API acceptance. Set campaign to ACCEPTED.
            campaign.status = CampaignStatus.ACCEPTED

        # Sync balance via Account Status API if provider supports check_balance
        try:
            if hasattr(provider, "check_balance"):
                latest_balance = await provider.check_balance()
                app_settings.sms_balance = int(float(latest_balance))
        except Exception as bal_ex:
            logger.warning(f"Could not sync account balance after campaign: {bal_ex}")

        db.add(campaign)
        db.add(app_settings)
        await db.commit()
        
        # Broadcast final completed events
        broadcast_campaign_progress(str(campaign.id), 100)
        
        if campaign.status in [CampaignStatus.ACCEPTED, CampaignStatus.COMPLETED]:
            broadcast_notification(f"Campaign '{campaign.name}' accepted by SMSlenz gateway.", "success")
        elif campaign.status == CampaignStatus.PARTIALLY_FAILED:
            broadcast_notification(f"Campaign '{campaign.name}' accepted with some failures.", "warning")
        else:
            broadcast_notification(f"Campaign '{campaign.name}' failed completely.", "error")
            
        logger.success(f"Finished processing campaign: {campaign_id}. Status: {campaign.status}")

@celery_app.task(name="process_sms_campaign")
def process_sms_campaign(campaign_id: str) -> None:
    """
    Celery task wrapper executing the async run_process_campaign script.
    """
    asyncio.run(run_process_campaign(campaign_id))

async def run_process_bulk_sms(phones: list[str], message: str, sender_id: str) -> None:
    """
    Runner for sending ad-hoc SMS in bulk to a list of phone numbers.
    Supports batching and live WebSocket progress updates per batch.
    """
    logger.info(f"Worker processing ad-hoc bulk SMS for {len(phones)} numbers.")
    broadcast_notification(f"Ad-hoc Bulk SMS dispatch started for {len(phones)} recipients.", "info")
    
    async with SessionLocal() as db:
        app_settings = await setting_repository.get_settings(db)
        gw_name = (getattr(settings, "SMS_GATEWAY", None) or app_settings.gateway or "SMSLENZ").upper()

        # Gateway selection
        if gw_name == "NOTIFY" or (getattr(settings, "NOTIFY_USER_ID", None) and getattr(settings, "NOTIFY_API_KEY", None)):
            provider = NotifySMSProvider(
                user_id=getattr(settings, "NOTIFY_USER_ID", None) or app_settings.api_key,
                api_key=getattr(settings, "NOTIFY_API_KEY", None) or app_settings.api_secret,
                sender_id=sender_id or getattr(settings, "NOTIFY_SENDER_ID", None) or app_settings.sender_id or "NotifyDEMO"
            )
            logger.info("[BULK SMS WORKER] Selected Provider: NotifySMSProvider | Gateway: NOTIFY")
        elif gw_name == "SMSLENZ" or (settings.SMSLENZ_USER_ID and settings.SMSLENZ_API_KEY):
            provider = SMSLenzProvider(
                user_id=settings.SMSLENZ_USER_ID or app_settings.api_key,
                api_key=settings.SMSLENZ_API_KEY or app_settings.api_secret,
                sender_id=sender_id or settings.SMSLENZ_SENDER_ID or app_settings.sender_id or "CAFECHAI"
            )
            logger.info("[BULK SMS WORKER] Selected Provider: SMSLenzProvider | Gateway: SMSLENZ")
        elif gw_name == "TWILIO" and app_settings.api_key and app_settings.api_secret:
            provider = TwilioSMSProvider(app_settings.api_key, app_settings.api_secret)
            logger.info("[BULK SMS WORKER] Selected Provider: TwilioSMSProvider | Gateway: TWILIO")
        else:
            provider = MockSMSProvider()
            logger.warning("[BULK SMS WORKER] Selected Provider: MockSMSProvider | Gateway: MOCK")

        # If provider supports native batch send
        if isinstance(provider, (SMSLenzProvider, NotifySMSProvider)):
            def batch_progress(b_idx: int, total_b: int, processed: int, total: int):
                pct = int((processed / total) * 100) if total > 0 else 100
                broadcast_notification(f"Bulk SMS Batch {b_idx}/{total_b} completed ({pct}%).", "info")

            results = await provider.send_bulk_sms(
                recipients=phones,
                message=message,
                sender_id=sender_id,
                batch_size=100,
                progress_callback=batch_progress
            )

            delivered_inc = sum(1 for r in results if r["status"] in (DeliveryStatus.ACCEPTED, DeliveryStatus.DELIVERED))
            failed_inc = len(results) - delivered_inc

            for res in results:
                log_entry = SMSLog(
                    phone=res["phone"],
                    message=message,
                    provider=app_settings.gateway,
                    status=res["status"],
                    error_message=res["error_message"],
                    sent_at=res["sent_at"],
                    delivered_at=res["sent_at"] if res["status"] == DeliveryStatus.DELIVERED else None
                )
                db.add(log_entry)
                broadcast_sms_status(res["phone"], res["status"].value, None, res["error_message"])

            # Sync balance
            if results and results[-1].get("sms_credit_balance") is not None:
                app_settings.sms_balance = int(float(results[-1]["sms_credit_balance"]))

        else:
            processed_count = 0
            total_phones = len(phones)
            delivered_inc = 0
            failed_inc = 0

            for phone in phones:
                processed_count += 1
                if app_settings.sms_balance < 1:
                    logger.warning("Ad-hoc bulk SMS halted: Insufficient balance.")
                    broadcast_notification("Ad-hoc bulk SMS dispatch halted: Insufficient balance.", "error")
                    break
                    
                try:
                    res = await provider.send_sms(
                        to_phone=phone,
                        message=message,
                        sender_id=sender_id
                    )
                    
                    if res["status"] in [DeliveryStatus.ACCEPTED, DeliveryStatus.SENT, DeliveryStatus.DELIVERED]:
                        app_settings.sms_balance -= 1
                        delivered_inc += 1
                    else:
                        failed_inc += 1
                        
                    log_entry = SMSLog(
                        phone=phone,
                        message=message,
                        provider=app_settings.gateway,
                        status=res["status"],
                        error_message=res["error_message"],
                        sent_at=res["sent_at"],
                        delivered_at=res["sent_at"] if res["status"] == DeliveryStatus.DELIVERED else None
                    )
                    db.add(log_entry)
                    
                    # Broadcast sms status
                    broadcast_sms_status(phone, res["status"].value, None, res["error_message"])
                except Exception as e:
                    logger.error(f"Error in ad-hoc bulk send to {phone}: {str(e)}")
                    failed_inc += 1
                    log_entry = SMSLog(
                        phone=phone,
                        message=message,
                        provider=app_settings.gateway,
                        status=DeliveryStatus.FAILED,
                        error_message=str(e)
                    )
                    db.add(log_entry)
                    
                    # Broadcast sms status
                    broadcast_sms_status(phone, "FAILED", None, str(e))
                    
                # Broadcast dashboard update and stats live
                broadcast_dashboard_update(
                    today=delivered_inc + failed_inc,
                    failed=failed_inc,
                    queued=total_phones - processed_count
                )

        db.add(app_settings)
        await db.commit()
        
        broadcast_notification(f"Ad-hoc Bulk SMS dispatch complete. Sent: {delivered_inc}, Failed: {failed_inc}", "success")
        logger.success("Finished processing ad-hoc bulk SMS.")

@celery_app.task(name="process_bulk_sms")
def process_bulk_sms(phones: list[str], message: str, sender_id: str) -> None:
    """
    Celery task wrapper executing the async run_process_bulk_sms script.
    """
    asyncio.run(run_process_bulk_sms(phones, message, sender_id))
