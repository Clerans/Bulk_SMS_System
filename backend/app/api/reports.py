import csv
import io
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.dependencies.auth import require_viewer
from app.models.campaign import DeliveryStatus
from app.models.sms_log import SMSLog
from app.schemas.report import DeliveryReportResponse

router = APIRouter(tags=["Reports"])

async def get_logs_query(
    db: AsyncSession,
    *,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    status_filter: Optional[DeliveryStatus] = None,
    campaign_id: Optional[uuid.UUID] = None
):
    """
    Shared query logic for delivery logs.
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
        
    if campaign_id:
        query = query.where(SMSLog.campaign_id == campaign_id)

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
    campaign_id: Optional[uuid.UUID] = Query(None, alias="campaignId"),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve delivery reports list (compatible with React frontend).
    """
    items, total = await get_logs_query(
        db,
        skip=skip,
        limit=limit,
        search=search,
        status_filter=status_filter,
        campaign_id=campaign_id
    )
    return {
        "success": True,
        "message": "Delivery logs retrieved",
        "data": [DeliveryReportResponse.model_validate(item) for item in items],
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
