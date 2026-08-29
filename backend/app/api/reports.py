import csv
import io
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from datetime import datetime
from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import BadRequestException, NotFoundException
from app.dependencies.auth import get_current_user, require_operator, require_viewer
from app.models.campaign import DeliveryStatus
from app.models.sms_log import SMSLog
from app.models.user import User
from app.repositories.setting import setting_repository
from app.schemas.report import DeliveryReportResponse
from app.services.providers.notify_provider import NotifySMSProvider
from app.services.providers.smslenz_provider import SMSLenzProvider
from app.services.sms_provider import MockSMSProvider, TwilioSMSProvider

router = APIRouter(tags=["Reports"])

async def get_logs_query(
    db: AsyncSession,
    *,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    status_filter: Optional[DeliveryStatus] = None,
    sender_id: Optional[str] = None,
    route: Optional[str] = None,
    campaign_id: Optional[uuid.UUID] = None,
    phone: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    """
    Shared query logic for delivery logs with enterprise filtering support.
    """
    query = select(SMSLog).options(selectinload(SMSLog.campaign))

    if search:
        query = query.where(
            or_(
                SMSLog.phone.ilike(f"%{search}%"),
                SMSLog.message.ilike(f"%{search}%")
            )
        )
        
    if status_filter:
        query = query.where(SMSLog.status == status_filter)
        
    if sender_id:
        query = query.where(SMSLog.sender_id.ilike(f"%{sender_id}%"))
        
    if route:
        query = query.where(SMSLog.route.ilike(f"%{route}%"))

    if campaign_id:
        query = query.where(SMSLog.campaign_id == campaign_id)

    if phone:
        query = query.where(SMSLog.phone.ilike(f"%{phone}%"))

    if start_date:
        try:
            dt_start = datetime.fromisoformat(start_date)
            query = query.where(SMSLog.created_at >= dt_start)
        except Exception:
            pass

    if end_date:
        try:
            dt_end = datetime.fromisoformat(end_date)
            query = query.where(SMSLog.created_at <= dt_end)
        except Exception:
            pass

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    count_res = await db.execute(count_query)
    total = count_res.scalar() or 0

    # Paginate and execute
    query = query.order_by(SMSLog.created_at.desc()).offset(skip).limit(limit)
    res = await db.execute(query)
    items = list(res.scalars().all())
    
    return items, total

# --- 1. Combined Frontend Router Endpoints (/delivery-reports) ---

@router.get("/delivery-reports", response_model=None, dependencies=[Depends(require_viewer)])
async def get_delivery_reports(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    status_filter: Optional[DeliveryStatus] = Query(None, alias="status"),
    sender_id: Optional[str] = Query(None, alias="senderId"),
    route: Optional[str] = Query(None),
    campaign_id: Optional[uuid.UUID] = Query(None, alias="campaignId"),
    phone: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None, alias="startDate"),
    end_date: Optional[str] = Query(None, alias="endDate"),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve delivery reports list with enterprise filters (compatible with React frontend).
    """
    items, total = await get_logs_query(
        db,
        skip=skip,
        limit=limit,
        search=search,
        status_filter=status_filter,
        sender_id=sender_id,
        route=route,
        campaign_id=campaign_id,
        phone=phone,
        start_date=start_date,
        end_date=end_date
    )
    return {
        "success": True,
        "message": "Delivery logs retrieved",
        "data": [DeliveryReportResponse.model_validate(item) for item in items],
        "total": total,
        "errors": None
    }

# --- 2. User Requested API Structure (/reports/*) ---

@router.get("/reports/delivery", response_model=None, dependencies=[Depends(require_viewer)])
async def get_reports_delivery(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    status_filter: Optional[DeliveryStatus] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all delivery logs. Compatible with user requested API tables specification.
    """
    items, total = await get_logs_query(db, skip=skip, limit=limit, search=search, status_filter=status_filter)
    return {
        "success": True,
        "message": "Delivery reports retrieved",
        "data": {
            "items": [DeliveryReportResponse.model_validate(item) for item in items],
            "total": total
        },
        "errors": None
    }

@router.get("/reports/failed", response_model=None, dependencies=[Depends(require_viewer)])
async def get_reports_failed(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Get failed delivery logs only.
    """
    items, total = await get_logs_query(db, skip=skip, limit=limit, search=search, status_filter=DeliveryStatus.FAILED)
    return {
        "success": True,
        "message": "Failed reports retrieved",
        "data": {
            "items": [DeliveryReportResponse.model_validate(item) for item in items],
            "total": total
        },
        "errors": None
    }

# --- 3. Export endpoints ---

def csv_generator(logs):
    """
    Generator streaming CSV rows.
    """
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(["ID", "Campaign Name", "Phone", "Status", "Message", "Sent At", "Delivered At", "Failure Reason"])
    yield output.getvalue()
    output.seek(0)
    output.truncate(0)

    for log in logs:
        campaign_name = log.campaign.name if log.campaign else "Ad-hoc SMS"
        writer.writerow([
            str(log.id),
            campaign_name,
            log.phone,
            log.status.value,
            log.message,
            log.sent_at.isoformat() if log.sent_at else "",
            log.delivered_at.isoformat() if log.delivered_at else "",
            log.error_message or ""
        ])
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)

@router.get("/delivery-reports/export", dependencies=[Depends(require_viewer)])
@router.get("/reports/export", dependencies=[Depends(require_viewer)])
async def export_delivery_reports(
    search: Optional[str] = Query(None),
    status_filter: Optional[DeliveryStatus] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db)
):
    """
    Stream delivery report logs as a CSV download (constant memory stream).
    Registers under both /delivery-reports/export and /reports/export routes.
    """
    items, _ = await get_logs_query(
        db,
        skip=0,
        limit=1000000, # Large limit to export all records
        search=search,
        status_filter=status_filter
    )
    
    return StreamingResponse(
        csv_generator(items),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sms_delivery_report.csv"}
    )

@router.post("/delivery-reports/{report_id}/retry", response_model=None)
@router.post("/reports/{report_id}/retry", response_model=None)
@router.post("/sms/retry/{report_id}", response_model=None)
async def retry_delivery_report(
    report_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retry sending a message from a delivery report or SMS log.
    """
    require_operator(current_user)

    query = select(SMSLog).options(selectinload(SMSLog.campaign)).where(SMSLog.id == report_id)
    res = await db.execute(query)
    log_entry = res.scalars().first()

    if not log_entry:
        raise NotFoundException(message="Message delivery record not found")

    app_settings = await setting_repository.get_settings(db)
    if app_settings.sms_balance < 1:
        raise BadRequestException(message="Insufficient SMS credits to resend message")

    # Select Provider
    gw_name = (getattr(settings, "SMS_GATEWAY", None) or app_settings.gateway or "SMSLENZ").upper()

    if gw_name == "NOTIFY" or (getattr(settings, "NOTIFY_USER_ID", None) and getattr(settings, "NOTIFY_API_KEY", None)):
        provider = NotifySMSProvider(
            user_id=getattr(settings, "NOTIFY_USER_ID", None) or app_settings.api_key,
            api_key=getattr(settings, "NOTIFY_API_KEY", None) or app_settings.api_secret,
            sender_id=log_entry.sender_id or getattr(settings, "NOTIFY_SENDER_ID", None) or app_settings.sender_id or "NotifyDEMO"
        )
    elif gw_name == "SMSLENZ" or (settings.SMSLENZ_USER_ID and settings.SMSLENZ_API_KEY):
        provider = SMSLenzProvider(
            user_id=settings.SMSLENZ_USER_ID or app_settings.api_key,
            api_key=settings.SMSLENZ_API_KEY or app_settings.api_secret,
            sender_id=log_entry.sender_id or settings.SMSLENZ_SENDER_ID or app_settings.sender_id or "CAFECHAI"
        )
    elif gw_name == "TWILIO" and app_settings.api_key and app_settings.api_secret:
        provider = TwilioSMSProvider(app_settings.api_key, app_settings.api_secret)
    else:
        provider = MockSMSProvider()

    sender = log_entry.sender_id or getattr(settings, "NOTIFY_SENDER_ID", None) or app_settings.default_sender_id or "NotifyDEMO"

    # Send retry
    send_res = await provider.send_sms(
        to_phone=log_entry.phone,
        message=log_entry.message,
        sender_id=sender
    )

    if send_res.get("sms_credit_balance") is not None:
        try:
            app_settings.sms_balance = int(float(send_res["sms_credit_balance"]))
            db.add(app_settings)
        except Exception:
            pass
    elif send_res["status"] in [DeliveryStatus.ACCEPTED, DeliveryStatus.SENT, DeliveryStatus.DELIVERED]:
        app_settings.sms_balance -= 1
        db.add(app_settings)

    log_entry.status = send_res["status"]
    log_entry.error_message = send_res["error_message"]
    log_entry.sent_at = send_res["sent_at"]
    log_entry.delivered_at = send_res["sent_at"] if send_res["status"] == DeliveryStatus.DELIVERED else None
    if send_res.get("gateway_message_id"):
        log_entry.gateway_message_id = send_res["gateway_message_id"]

    db.add(log_entry)
    await db.commit()
    await db.refresh(log_entry)

    return {
        "success": True,
        "message": "Message resent successfully",
        "data": DeliveryReportResponse.model_validate(log_entry),
        "errors": None
    }

