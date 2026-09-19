import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import BadRequestException, NotFoundException
from app.dependencies.auth import get_current_user, require_operator, require_viewer
from app.models.campaign import DeliveryStatus
from app.models.sms_log import SMSLog
from app.models.user import User
from app.repositories.setting import setting_repository
from app.schemas.sms import SendBulkSMSRequest, SendSMSRequest
from app.schemas.report import DeliveryReportResponse
from app.services.file_service import file_service
from app.services.sms_provider import MockSMSProvider, TwilioSMSProvider, get_sms_provider
from app.services.providers.smslenz_provider import SMSLenzProvider
from app.services.providers.notify_provider import NotifySMSProvider

router = APIRouter(prefix="/sms", tags=["SMS"])

@router.post("/send", response_model=None)
async def send_single_sms(
    payload: SendSMSRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Send an ad-hoc SMS to a single recipient immediately. Deducts credit or syncs with gateway balance.
    """
    require_operator(current_user)

    normalized_phone = file_service.normalize_phone(payload.phone)
    if not normalized_phone:
        raise BadRequestException(message="Invalid phone number format")

    app_settings = await setting_repository.get_settings(db)
    if app_settings.sms_balance < 1:
        raise BadRequestException(message="Insufficient SMS balance credits")

    # Gateway Selection Strategy: SMS_GATEWAY env var / NOTIFY credentials -> DB Setting -> Fallback
    gw_name = (getattr(settings, "SMS_GATEWAY", None) or app_settings.gateway or "SMSLENZ").upper()

    if gw_name == "NOTIFY" or (getattr(settings, "NOTIFY_USER_ID", None) and getattr(settings, "NOTIFY_API_KEY", None)):
        provider = NotifySMSProvider(
            user_id=getattr(settings, "NOTIFY_USER_ID", None) or app_settings.api_key,
            api_key=getattr(settings, "NOTIFY_API_KEY", None) or app_settings.api_secret,
            sender_id=payload.sender_id or getattr(settings, "NOTIFY_SENDER_ID", None) or app_settings.sender_id or "NotifyDEMO"
        )
    elif gw_name == "SMSLENZ" or (settings.SMSLENZ_USER_ID and settings.SMSLENZ_API_KEY):
        provider = SMSLenzProvider(
            user_id=settings.SMSLENZ_USER_ID or app_settings.api_key,
            api_key=settings.SMSLENZ_API_KEY or app_settings.api_secret,
            sender_id=payload.sender_id or settings.SMSLENZ_SENDER_ID or app_settings.sender_id or "CAFECHAI"
        )
    elif gw_name == "TWILIO" and app_settings.api_key and app_settings.api_secret:
        provider = TwilioSMSProvider(app_settings.api_key, app_settings.api_secret)
    else:
        provider = MockSMSProvider()

    sender = payload.sender_id or getattr(settings, "NOTIFY_SENDER_ID", None) or getattr(settings, "SMSLENZ_SENDER_ID", None) or app_settings.default_sender_id or "NotifyDEMO"

    # Dispatch SMS
    try:
        res = await provider.send_sms(
            to_phone=normalized_phone,
            message=payload.message,
            sender_id=sender
        )
        
        # Synchronize credit balance if provided by gateway response
        if res.get("sms_credit_balance") is not None:
            try:
                app_settings.sms_balance = int(float(res["sms_credit_balance"]))
                db.add(app_settings)
            except Exception:
                pass
        elif res["status"] in [DeliveryStatus.ACCEPTED, DeliveryStatus.SENT, DeliveryStatus.DELIVERED]:
            app_settings.sms_balance -= 1
            db.add(app_settings)

        # Log entry
        log_entry = SMSLog(
            phone=normalized_phone,
            message=payload.message,
            provider="SMSLENZ" if isinstance(provider, SMSLenzProvider) else app_settings.gateway,
            status=res["status"],
            error_message=res["error_message"],
            sent_at=res["sent_at"],
            delivered_at=res["sent_at"] if res["status"] == DeliveryStatus.DELIVERED else None
        )
        db.add(log_entry)
        await db.commit()
        await db.refresh(log_entry)

        # Eager load campaign details (None) for response serializer
        log_entry.campaign = None

        is_accepted = res["status"] in [DeliveryStatus.ACCEPTED, DeliveryStatus.SENT, DeliveryStatus.DELIVERED]

        return {
            "success": is_accepted,
            "message": "SMS request accepted by gateway" if is_accepted else f"SMS dispatch failed: {res['error_message']}",
            "data": DeliveryReportResponse.model_validate(log_entry),
            "errors": None if is_accepted else [{"message": res["error_message"] or "SMS dispatch failed"}]
        }
    except Exception as ex:
        raise BadRequestException(message=f"Failed to process SMS dispatch: {str(ex)}")

@router.post("/send-bulk", response_model=None, status_code=status.HTTP_202_ACCEPTED)
async def send_bulk_sms(
    payload: SendBulkSMSRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Trigger bulk ad-hoc SMS dispatch. Dispatches to Celery task.
    """
    require_operator(current_user)

    valid_phones = []
    for ph in payload.phones:
        norm = file_service.normalize_phone(ph)
        if norm:
            valid_phones.append(norm)

    if not valid_phones:
        raise BadRequestException(message="No valid phone numbers found in request")

    app_settings = await setting_repository.get_settings(db)
    if app_settings.sms_balance < len(valid_phones):
        raise BadRequestException(message=f"Insufficient credits. Remaining: {app_settings.sms_balance}")

    # Import celery tasks inside endpoint to prevent circular importing
    from app.workers.tasks import process_bulk_sms
    
    sender = payload.sender_id or app_settings.default_sender_id
    process_bulk_sms.delay(valid_phones, payload.message, sender)

    return {
        "success": True,
        "message": f"Bulk SMS queued for {len(valid_phones)} recipients.",
        "data": {
            "queued_count": len(valid_phones)
        },
        "errors": None
    }

@router.get("/history", response_model=None, dependencies=[Depends(require_viewer)])
async def get_sms_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve paginated history of all SMS dispatches.
    """
    query = select(SMSLog).options(selectinload(SMSLog.campaign))
    
    # Get total count
    count_query = select(func.count(SMSLog.id))
    count_res = await db.execute(count_query)
    total = count_res.scalar() or 0

    # Execute paginate
    query = query.order_by(SMSLog.created_at.desc()).offset(skip).limit(limit)
    res = await db.execute(query)
    logs = list(res.scalars().all())

    return {
        "success": True,
        "message": "SMS logs history retrieved",
        "data": {
            "items": [DeliveryReportResponse.model_validate(log) for log in logs],
            "total": total,
            "skip": skip,
            "limit": limit
        },
        "errors": None
    }

@router.get("/status/{log_id}", response_model=None, dependencies=[Depends(require_viewer)])
async def get_sms_status(
    log_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve delivery status details of a specific SMS dispatch.
    """
    query = select(SMSLog).where(SMSLog.id == log_id).options(selectinload(SMSLog.campaign))
    res = await db.execute(query)
    log_entry = res.scalars().first()

    if not log_entry:
        raise NotFoundException(message="SMS Log entry not found")

    return {
        "success": True,
        "message": "SMS status retrieved",
        "data": DeliveryReportResponse.model_validate(log_entry),
        "errors": None
    }


# =========================================================================
# Official Dialog eSMS Delivery Report Webhook & Gateway Health Endpoints
# =========================================================================

from datetime import datetime, timezone
from app.models.campaign import Campaign, CampaignRecipient, CampaignStatus
from app.models.delivery_event import DeliveryEvent
from app.models.contact import Contact
from app.websocket.events import (
    broadcast_campaign_progress,
    broadcast_sms_status,
    broadcast_dashboard_update,
    broadcast_notification
)
from app.services.providers.esms_provider import DialogESMSProvider


@router.get("/delivery-report", response_model=None)
async def esms_delivery_report_webhook(
    campaignId: Optional[str] = Query(None, description="Gateway Campaign ID returned during SMS send"),
    msisdn: Optional[str] = Query(None, description="Recipient MSISDN mobile number"),
    status: Optional[int] = Query(None, description="Delivery Status (1=SMSC submit, 2=submission failed, 3=delivered, 4=failed)"),
    db: AsyncSession = Depends(get_db)
):
    """
    Official Dialog eSMS v3.2 Delivery Report Webhook Callback Endpoint.
    
    Receives HTTP GET request from Dialog eSMS gateway:
    GET /api/v1/sms/delivery-report?campaignId=25&msisdn=94777888665&status=1
    
    Status mapping:
    1 -> SUBMITTED (Successfully submitted to SMSC - not final delivery)
    2 -> FAILED (SMS submission failed due to invalid number or connectivity failure)
    3 -> DELIVERED (Successfully delivered to handset)
    4 -> FAILED (Delivery failed)
    """
    if not campaignId or not msisdn or status is None:
        return {
            "status": "error",
            "message": "Missing required parameters (campaignId, msisdn, status)"
        }

    # Normalize incoming mobile number
    is_valid, norm_9digit = DialogESMSProvider.normalize_dialog_mobile(msisdn)
    clean_msisdn = norm_9digit if is_valid else msisdn.strip()

    # 1. Record raw delivery event for idempotency and audit trail
    delivery_event = DeliveryEvent(
        gateway_campaign_id=str(campaignId),
        mobile_number=clean_msisdn,
        gateway_status=status,
        event_type=f"STATUS_{status}",
        raw_payload=f"campaignId={campaignId}&msisdn={msisdn}&status={status}",
        received_at=datetime.now(timezone.utc)
    )
    db.add(delivery_event)

    # 2. Map status code to internal DeliveryStatus
    new_delivery_status = None
    status_desc = None
    if status == 1:
        new_delivery_status = DeliveryStatus.SUBMITTED
        status_desc = "Successfully submitted to SMSC"
    elif status == 2:
        new_delivery_status = DeliveryStatus.FAILED
        status_desc = "SMS submission failed (invalid number or connectivity failure)"
    elif status == 3:
        new_delivery_status = DeliveryStatus.DELIVERED
        status_desc = "Successfully delivered to recipient"
    elif status == 4:
        new_delivery_status = DeliveryStatus.FAILED
        status_desc = "SMS delivery failed"
    else:
        new_delivery_status = DeliveryStatus.PROCESSING
        status_desc = f"Unknown status code: {status}"

    # 3. Locate matching Campaign and CampaignRecipient
    # Search by gateway_campaign_id or matching recipient phone
    campaign_query = select(Campaign).where(Campaign.gateway_campaign_id == str(campaignId))
    camp_res = await db.execute(campaign_query)
    campaign = camp_res.scalars().first()

    recipient_record = None
    if campaign:
        delivery_event.campaign_id = campaign.id
        
        # Look up recipient linked to this campaign by phone
        rec_query = (
            select(CampaignRecipient)
            .join(Contact, CampaignRecipient.contact_id == Contact.id)
            .where(
                CampaignRecipient.campaign_id == campaign.id,
                (
                    Contact.phone.ilike(f"%{clean_msisdn}%") |
                    (CampaignRecipient.normalized_mobile_number == clean_msisdn)
                )
            )
        )
        rec_res = await db.execute(rec_query)
        recipient_record = rec_res.scalars().first()

    if recipient_record:
        delivery_event.campaign_recipient_id = recipient_record.id
        
        # Idempotency and out-of-order check:
        # If recipient is already marked DELIVERED (status 3), do not regress back to SUBMITTED (status 1)
        if not (recipient_record.status == DeliveryStatus.DELIVERED and new_delivery_status == DeliveryStatus.SUBMITTED):
            recipient_record.status = new_delivery_status
            recipient_record.gateway_status_code = str(status)
            if new_delivery_status == DeliveryStatus.DELIVERED:
                recipient_record.delivered_at = datetime.now(timezone.utc)
            elif new_delivery_status == DeliveryStatus.FAILED:
                recipient_record.failed_at = datetime.now(timezone.utc)
                recipient_record.error_message = status_desc
            elif new_delivery_status == DeliveryStatus.SUBMITTED:
                recipient_record.submitted_at = datetime.now(timezone.utc)

            db.add(recipient_record)

    # Also update matching SMSLog entry if exists
    log_query = (
        select(SMSLog)
        .where(
            SMSLog.phone.ilike(f"%{clean_msisdn}%"),
            (SMSLog.gateway_message_id == str(campaignId)) | (SMSLog.campaign_id == (campaign.id if campaign else None))
        )
        .order_by(SMSLog.created_at.desc())
    )
    log_res = await db.execute(log_query)
    sms_log = log_res.scalars().first()
    if sms_log:
        if not (sms_log.status == DeliveryStatus.DELIVERED and new_delivery_status == DeliveryStatus.SUBMITTED):
            sms_log.status = new_delivery_status
            if new_delivery_status == DeliveryStatus.DELIVERED:
                sms_log.delivered_at = datetime.now(timezone.utc)
            elif new_delivery_status == DeliveryStatus.FAILED:
                sms_log.error_message = status_desc
            db.add(sms_log)

    # 4. Recalculate campaign statistics if campaign exists
    if campaign:
        stats_query = (
            select(
                CampaignRecipient.status,
                func.count(CampaignRecipient.id)
            )
            .where(CampaignRecipient.campaign_id == campaign.id)
            .group_by(CampaignRecipient.status)
        )
        stats_res = await db.execute(stats_query)
        status_counts = dict(stats_res.all())

        delivered_c = status_counts.get(DeliveryStatus.DELIVERED, 0)
        failed_c = status_counts.get(DeliveryStatus.FAILED, 0)
        submitted_c = status_counts.get(DeliveryStatus.SUBMITTED, 0) + status_counts.get(DeliveryStatus.ACCEPTED, 0)
        pending_c = campaign.recipient_count - (delivered_c + failed_c)

        campaign.delivered_count = delivered_c
        campaign.failed_count = failed_c
        campaign.pending_count = max(0, pending_c)

        if delivered_c + failed_c >= campaign.recipient_count and campaign.recipient_count > 0:
            campaign.status = CampaignStatus.COMPLETED if failed_c == 0 else (CampaignStatus.PARTIALLY_FAILED if delivered_c > 0 else CampaignStatus.FAILED)
            campaign.completed_at = datetime.now(timezone.utc)

        db.add(campaign)

        # Broadcast live progress updates
        progress_pct = round(((delivered_c + failed_c) / campaign.recipient_count) * 100, 1) if campaign.recipient_count > 0 else 100.0
        broadcast_campaign_progress(
            campaign_id=str(campaign.id),
            progress=progress_pct,
            recipient_count=campaign.recipient_count,
            sent_count=delivered_c + failed_c,
            delivered_count=delivered_c,
            failed_count=failed_c,
            pending_count=max(0, pending_c),
            status=campaign.status.value
        )

    await db.commit()

    # Broadcast real-time single SMS status
    broadcast_sms_status(
        phone=clean_msisdn,
        status=new_delivery_status.value if new_delivery_status else "UNKNOWN",
        campaign_id=str(campaign.id) if campaign else None,
        reason=status_desc if new_delivery_status == DeliveryStatus.FAILED else None
    )

    return {
        "status": "success",
        "comment": "Delivery report processed successfully",
        "data": {
            "campaignId": campaignId,
            "msisdn": clean_msisdn,
            "status": status,
            "mappedStatus": new_delivery_status.value if new_delivery_status else None
        }
    }


@router.get("/gateway/health", response_model=None, dependencies=[Depends(require_viewer)])
async def get_gateway_health(db: AsyncSession = Depends(get_db)):
    """
    Operational health and connectivity check for configured SMS Gateways (Dialog eSMS).
    Safe to view: Never exposes API passwords or access tokens.
    """
    app_settings = await setting_repository.get_settings(db)
    active_gw = (getattr(settings, "SMS_GATEWAY", None) or app_settings.gateway or "ESMS").upper()

    esms_configured = bool(
        (getattr(settings, "ESMS_USERNAME", None) and getattr(settings, "ESMS_PASSWORD", None)) or
        (app_settings.api_key and app_settings.api_secret and active_gw == "ESMS")
    )
    
    token_valid = False
    if esms_configured:
        token_mgr = DialogESMSProvider().token_manager
        token_valid = token_mgr.is_token_valid()

    return {
        "success": True,
        "message": "SMS Gateway status retrieved",
        "data": {
            "activeGateway": active_gw,
            "isConfigured": esms_configured if active_gw == "ESMS" else bool(app_settings.api_key),
            "tokenActive": token_valid,
            "defaultSenderId": getattr(settings, "ESMS_DEFAULT_MASK", None) or app_settings.default_sender_id or "CAFECHAI",
            "paymentMethod": getattr(settings, "ESMS_PAYMENT_METHOD", 0),
            "batchLimit": getattr(settings, "ESMS_BATCH_SIZE", 1000),
            "sendTpsLimit": getattr(settings, "ESMS_SEND_TPS_LIMIT", 20),
            "statusCheckTpsLimit": getattr(settings, "ESMS_STATUS_CHECK_TPS_LIMIT", 2),
            "webhookUrl": getattr(settings, "ESMS_DELIVERY_REPORT_URL", None),
            "systemBalance": app_settings.sms_balance
        },
        "errors": None
    }
