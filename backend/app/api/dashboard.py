from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import require_viewer
from app.models.campaign import Campaign, CampaignStatus, DeliveryStatus
from app.models.sms_log import SMSLog
from app.repositories.setting import setting_repository
from app.schemas.report import DeliveryReportResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=None, dependencies=[Depends(require_viewer)])
async def get_dashboard_summary(db: AsyncSession = Depends(get_db)):
    """
    Retrieve live aggregated counters for dashboard cards.
    """
    # 1. Active campaigns count
    active_campaigns_query = select(func.count(Campaign.id)).where(
        Campaign.status.in_([CampaignStatus.QUEUED, CampaignStatus.PROCESSING]),
        Campaign.is_deleted == False
    )
    active_campaigns_res = await db.execute(active_campaigns_query)
    active_campaigns = active_campaigns_res.scalar() or 0

    # 2. Total campaigns count
    campaigns_query = select(func.count(Campaign.id)).where(Campaign.is_deleted == False)
    campaigns_res = await db.execute(campaigns_query)
    campaign_count = campaigns_res.scalar() or 0

    # 3. Retrieve settings for SMS Balance
    settings = await setting_repository.get_settings(db)
    sms_balance = settings.sms_balance

    # 4. SMS Delivery counters
    log_query = select(
        func.count(SMSLog.id).label("total"),
        func.count(case((SMSLog.status == DeliveryStatus.DELIVERED, 1))).label("delivered"),
        func.count(case((SMSLog.status == DeliveryStatus.FAILED, 1))).label("failed")
    )
    log_res = await db.execute(log_query)
    log_row = log_res.first()
    
    total_sent = log_row.total if log_row else 0
    delivered = log_row.delivered if log_row else 0
    failed = log_row.failed if log_row else 0

    return {
        "success": True,
        "message": "Dashboard summary retrieved successfully",
        "data": {
            "totalSent": total_sent,
            "delivered": delivered,
            "failed": failed,
            "activeCampaigns": active_campaigns,
            "smsBalance": sms_balance,
            "campaignCount": campaign_count
        },
        "errors": None
    }

@router.get("/delivery-trend", response_model=None, dependencies=[Depends(require_viewer)])
async def get_delivery_trend(
    range_param: str = Query("30d", alias="range", regex="^(7d|30d)$"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get daily delivery status counts grouped by date for charts. Supported ranges: 7d, 30d.
    """
    days = 7 if range_param == "7d" else 30
    start_date = datetime.now(timezone.utc) - timedelta(days=days)

    # Group by date string formatted YYYY-MM-DD
    # For SQLite and PostgreSQL, to_char is standard in PG, but func.substr/strftime in SQLite.
    # Since we are deploying to PostgreSQL, we'll write standard PG func: func.to_char
    date_field = func.to_char(SMSLog.created_at, "YYYY-MM-DD").label("date")
    
    trend_query = (
        select(
            date_field,
            func.count(case((SMSLog.status == DeliveryStatus.DELIVERED, 1))).label("delivered"),
            func.count(case((SMSLog.status == DeliveryStatus.FAILED, 1))).label("failed")
        )
        .where(SMSLog.created_at >= start_date)
        .group_by(date_field)
        .order_by(date_field.asc())
    )
    
    res = await db.execute(trend_query)
    rows = res.all()

    # Format result list
    items = []
    for row in rows:
        items.append({
            "date": row.date,
            "delivered": row.delivered,
            "failed": row.failed
        })

    # If no data exists, pad with mock/empty items for the requested range to keep the UI graph looking nice
    if not items:
        for i in range(days):
            d = (datetime.now(timezone.utc) - timedelta(days=days-1-i)).strftime("%Y-%m-%d")
            items.append({"date": d, "delivered": 0, "failed": 0})

    return {
        "success": True,
        "message": "Delivery trend retrieved successfully",
        "data": items,
        "errors": None
    }

@router.get("/charts", response_model=None, dependencies=[Depends(require_viewer)])
async def get_charts_redirect(
    range_param: str = Query("30d", alias="range", regex="^(7d|30d)$"),
    db: AsyncSession = Depends(get_db)
):
    """
    Alias endpoint for /charts matching user REST API list specifications.
    """
    return await get_delivery_trend(range_param=range_param, db=db)

@router.get("/recent", response_model=None, dependencies=[Depends(require_viewer)])
async def get_recent_activity(
    limit: int = Query(5, ge=1, le=20),
    db: AsyncSession = Depends(get_db)
):
    """
    Fetch the most recent SMS Logs for activity feeds.
    """
    from sqlalchemy.orm import selectinload
    query = (
        select(SMSLog)
        .options(selectinload(SMSLog.campaign))
        .order_by(SMSLog.created_at.desc())
        .limit(limit)
    )
    res = await db.execute(query)
    logs = list(res.scalars().all())

    return {
        "success": True,
        "message": "Recent activity logs retrieved",
        "data": [DeliveryReportResponse.model_validate(log) for log in logs],
        "errors": None
    }
