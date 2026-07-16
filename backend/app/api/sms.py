import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

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
from app.services.sms_provider import MockSMSProvider, TwilioSMSProvider

router = APIRouter(prefix="/sms", tags=["SMS"])

@router.post("/send", response_model=None)
async def send_single_sms(
    payload: SendSMSRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Send an ad-hoc SMS to a single recipient immediately. Deducts credit from global settings balance.
    """
    require_operator(current_user)

    normalized_phone = file_service.normalize_phone(payload.phone)
    if not normalized_phone:
        raise BadRequestException(message="Invalid phone number format")

    app_settings = await setting_repository.get_settings(db)
    if app_settings.sms_balance < 1:
        raise BadRequestException(message="Insufficient SMS balance credits")

    # Instantiate Provider
    if app_settings.gateway.upper() == "TWILIO" and app_settings.api_key and app_settings.api_secret:
        provider = TwilioSMSProvider(app_settings.api_key, app_settings.api_secret)
    else:
        provider = MockSMSProvider()

    sender = payload.sender_id or app_settings.default_sender_id

    # Dispatch SMS
    try:
        res = await provider.send_sms(
            to_phone=normalized_phone,
            message=payload.message,
            sender_id=sender
        )
        
        # Deduct credits if sent successfully
        if res["status"] == DeliveryStatus.DELIVERED:
            app_settings.sms_balance -= 1
            db.add(app_settings)

        # Log entry
        log_entry = SMSLog(
            phone=normalized_phone,
            message=payload.message,
            provider=app_settings.gateway,
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

        return {
            "success": True,
            "message": "SMS processed",
            "data": DeliveryReportResponse.model_validate(log_entry),
            "errors": None
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
