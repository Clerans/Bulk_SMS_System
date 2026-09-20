import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import BadRequestException, NotFoundException
from app.dependencies.auth import get_current_user, require_operator, require_viewer
from app.models.campaign import Campaign, CampaignStatus, CampaignRecipient, DeliveryStatus
from app.models.contact import Contact
from app.models.group import group_contacts
from app.models.user import User
from app.repositories.campaign import campaign_repository
from app.repositories.contact import contact_repository
from app.repositories.group import group_repository
from app.schemas.campaign import CampaignCreate, CampaignResponse, CampaignUpdate
from app.services.file_service import file_service
from app.services.audit_service import audit_service
from app.workers.tasks import process_sms_campaign

from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/campaigns", tags=["Campaigns"])

async def format_campaign_dict(db: AsyncSession, campaign: Campaign) -> dict:
    query = (
        select(Campaign)
        .options(
            selectinload(Campaign.creator),
            selectinload(Campaign.template),
            selectinload(Campaign.recipients),
            selectinload(Campaign.batches)
        )
        .where(Campaign.id == campaign.id)
    )
    res = await db.execute(query)
    c = res.scalar_one_or_none() or campaign

    breakdown = {
        "QUEUED": 0, "PROCESSING": 0, "ACCEPTED": 0, "SUBMITTED": 0,
        "SENT": 0, "DELIVERED": 0, "READ": 0, "FAILED": 0, "EXPIRED": 0, "REJECTED": 0
    }
    msg_ids = []
    if hasattr(c, "recipients") and c.recipients:
        for r in c.recipients:
            st = r.status.value if hasattr(r.status, "value") else str(r.status)
            if st in breakdown:
                breakdown[st] += 1
            else:
                breakdown[st] = 1
            if getattr(r, "gateway_message_id", None):
                msg_ids.append(r.gateway_message_id)

    total = c.recipient_count or (len(c.recipients) if hasattr(c, "recipients") and c.recipients else 0)
    delivered = c.delivered_count or 0
    failed = c.failed_count or 0
    pending = c.pending_count or 0
    sent_cnt = max(0, total - pending)
    pct_val = round((sent_cnt / total * 100), 1) if total > 0 else 0.0

    progress_obj = {
        "percentage": pct_val,
        "sent": sent_cnt,
        "delivered": delivered,
        "failed": failed,
        "pending": pending
    }

    created_by_val = c.creator.name if (hasattr(c, "creator") and c.creator and getattr(c.creator, "name", None)) else (c.creator.email if hasattr(c, "creator") and c.creator else "System")
    template_val = c.template.name if (hasattr(c, "template") and c.template and getattr(c.template, "name", None)) else None

    # Format batches
    batches_data = []
    if hasattr(c, "batches") and c.batches:
        for b in c.batches:
            batches_data.append({
                "id": str(b.id),
                "batchNumber": b.batch_number,
                "transactionId": b.transaction_id,
                "gatewayCampaignId": b.gateway_campaign_id,
                "recipientCount": b.recipient_count,
                "acceptedCount": b.accepted_count,
                "submittedCount": b.submitted_count,
                "deliveredCount": b.delivered_count,
                "failedCount": b.failed_count,
                "status": b.status.value if hasattr(b.status, "value") else str(b.status),
                "cost": b.cost,
                "errorCode": b.error_code,
                "errorMessage": b.error_message,
                "startedAt": b.started_at.isoformat() if b.started_at else None,
                "completedAt": b.completed_at.isoformat() if b.completed_at else None,
                "createdAt": b.created_at.isoformat() if b.created_at else None,
            })

    return {
        "id": str(c.id),
        "name": c.name,
        "senderId": c.sender_id,
        "message": c.message,
        "status": c.status.value if hasattr(c.status, "value") else str(c.status),
        "recipientCount": c.recipient_count,
        "deliveredCount": c.delivered_count,
        "failedCount": c.failed_count,
        "pendingCount": c.pending_count,
        "submittedCount": c.submitted_count,
        "smsUnits": c.sms_units,
        "route": c.route,
        "template": template_val,
        "createdBy": created_by_val,
        "gateway": getattr(c, "gateway", None) or "Dialog eSMS",
        "queueId": getattr(c, "queue_id", None),
        "transactionId": getattr(c, "transaction_id", None),
        "gatewayCampaignId": getattr(c, "gateway_campaign_id", None),
        "cost": getattr(c, "cost", 0.0) or 0.0,
        "walletBalance": getattr(c, "wallet_balance", None),
        "messageIds": msg_ids,
        "retryCount": getattr(c, "retry_count", 0) or 0,
        "batches": batches_data,
        "progress": progress_obj,
        "statusBreakdown": breakdown,
        "scheduledAt": c.scheduled_time.isoformat() if getattr(c, "scheduled_time", None) else None,
        "sentAt": c.sent_at.isoformat() if getattr(c, "sent_at", None) else None,
        "createdAt": c.created_at.isoformat() if getattr(c, "created_at", None) else None
    }

@router.get("", response_model=None, dependencies=[Depends(require_viewer)])
async def get_campaigns(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    status_filter: Optional[CampaignStatus] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db)
):
    """
    List campaigns (paginated, sorted, and filtered by name or status).
    """
    items, total = await campaign_repository.search_campaigns(
        db,
        skip=skip,
        limit=limit,
        search=search,
        status=status_filter
    )
    formatted_items = [await format_campaign_dict(db, item) for item in items]
    return {
        "success": True,
        "message": "Campaigns retrieved successfully",
        "data": {
            "items": formatted_items,
            "total": total,
            "skip": skip,
            "limit": limit
        },
        "errors": None
    }

@router.get("/{campaign_id}", response_model=None, dependencies=[Depends(require_viewer)])
async def get_campaign(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve details of a single campaign, including its stats, batch breakdown, and enterprise metadata.
    """
    campaign = await campaign_repository.get(db, id=campaign_id)
    if not campaign:
        raise NotFoundException(message="Campaign not found")
        
    c_data = await format_campaign_dict(db, campaign)
    return {
        "success": True,
        "message": "Campaign retrieved successfully",
        "data": c_data,
        "errors": None
    }

@router.get("/{campaign_id}/progress", response_model=None, dependencies=[Depends(require_viewer)])
async def get_campaign_progress(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve real-time delivery and progress metrics for a specific campaign.
    """
    campaign = await campaign_repository.get(db, id=campaign_id)
    if not campaign:
        raise NotFoundException(message="Campaign not found")

    total = campaign.recipient_count or 0
    delivered = campaign.delivered_count or 0
    failed = campaign.failed_count or 0
    pending = campaign.pending_count or 0
    submitted = max(0, total - pending)
    pct = round((submitted / total * 100), 1) if total > 0 else 0.0

    return {
        "success": True,
        "message": "Campaign progress retrieved",
        "data": {
            "campaign_id": str(campaign.id),
            "status": campaign.status.value,
            "total": total,
            "submitted": submitted,
            "delivered": delivered,
            "failed": failed,
            "pending": pending,
            "progress_percentage": pct,
            "transaction_id": campaign.transaction_id,
            "gateway_campaign_id": campaign.gateway_campaign_id
        },
        "errors": None
    }

@router.post("", response_model=None, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    data: CampaignCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new SMS Campaign, link target contacts (manual/CSV/groups), validate SMS segmentation and balance, and queue for dispatch.
    """
    require_operator(current_user)

    from app.repositories.setting import setting_repository
    from app.services.sms_segment_service import sms_segment_service
    from app.services.providers.esms_provider import DialogESMSProvider

    # 1. Resolve and validate recipient contacts
    contacts = []
    source_upper = (data.recipient_source or "GROUPS").upper()
    
    if source_upper == "GROUPS":
        if not data.group_ids:
            raise BadRequestException(message="Group IDs are required when recipientSource is 'GROUPS'")
        
        query = select(Contact).join(group_contacts).where(
            group_contacts.c.group_id.in_(data.group_ids),
            Contact.is_deleted == False
        )
        res = await db.execute(query)
        contacts = list(res.scalars().all())
        
    elif source_upper in ("MANUAL", "CSV"):
        if not data.recipients:
            raise BadRequestException(message=f"Recipients list is required when recipientSource is '{source_upper}'")
            
        for r in data.recipients:
            raw_phone = r.phone if hasattr(r, "phone") else str(r)
            norm_phone = file_service.normalize_phone(raw_phone)
            if not norm_phone:
                continue
                
            contact = await contact_repository.get_by_phone(db, phone=norm_phone)
            if not contact:
                name_str = (r.name if hasattr(r, "name") and r.name else "").strip() or "Recipient"
                names = name_str.split(" ", 1)
                fname = names[0]
                lname = names[1] if len(names) > 1 else "Contact"
                contact = await contact_repository.create(db, obj_in={
                    "first_name": fname,
                    "last_name": lname,
                    "phone": norm_phone,
                    "created_by": current_user.id
                })
            contacts.append(contact)
            
    else:
        raise BadRequestException(message=f"Invalid recipient source '{data.recipient_source}'. Supported sources: GROUPS, CSV, MANUAL.")

    if not contacts:
        raise BadRequestException(message="No valid target contacts found for this campaign.")

    # Deduplicate contacts by ID and phone number
    seen_ids = set()
    seen_phones = set()
    unique_contacts = []
    for c in contacts:
        if c.id not in seen_ids and c.phone not in seen_phones:
            seen_ids.add(c.id)
            seen_phones.add(c.phone)
            unique_contacts.append(c)

    recipient_count = len(unique_contacts)
    if recipient_count == 0:
        raise BadRequestException(message="All provided phone numbers were invalid or duplicates.")

    # 2. Authoritative Backend SMS Segmentation & Balance Check
    total_sms_units, segments_per_msg, encoding = sms_segment_service.calculate_campaign_sms_units(
        message=data.message,
        recipient_count=recipient_count
    )

    app_settings = await setting_repository.get_settings(db)
    if app_settings.sms_balance < total_sms_units:
        raise BadRequestException(
            message=f"Insufficient SMS credits. Campaign requires {total_sms_units} SMS units ({recipient_count} recipients × {segments_per_msg} segments [{encoding}]), but available balance is {app_settings.sms_balance}."
        )

    # 3. Create Campaign record
    campaign_status = CampaignStatus.QUEUED if data.schedule_type == "NOW" else CampaignStatus.SCHEDULED
    
    campaign_data = {
        "name": data.name,
        "sender_id": data.sender_id,
        "message": data.message,
        "template_id": data.template_id,
        "status": campaign_status,
        "route": data.route_id,
        "scheduled_time": data.scheduled_at if data.schedule_type == "SCHEDULED" else None,
        "recipient_count": recipient_count,
        "pending_count": recipient_count,
        "sms_units": total_sms_units,
        "created_by": current_user.id
    }
    
    db_campaign = await campaign_repository.create(db, obj_in=campaign_data)

    # 4. Create CampaignRecipient records
    for contact in unique_contacts:
        is_valid_dialog, norm_9digit = DialogESMSProvider.normalize_dialog_mobile(contact.phone)
        recipient = CampaignRecipient(
            campaign_id=db_campaign.id,
            contact_id=contact.id,
            status=DeliveryStatus.PENDING,
            sms_units=segments_per_msg,
            normalized_mobile_number=norm_9digit if is_valid_dialog else None
        )
        db.add(recipient)
        
    await db.commit()
    await db.refresh(db_campaign)

    # 5. Audit Logging
    await audit_service.log_action(
        db,
        user_id=current_user.id,
        action="CREATE_CAMPAIGN",
        details={
            "campaign_id": str(db_campaign.id),
            "name": db_campaign.name,
            "recipient_count": recipient_count,
            "sms_units": total_sms_units,
            "segments_per_msg": segments_per_msg,
            "encoding": encoding,
            "scheduled_time": str(db_campaign.scheduled_time) if db_campaign.scheduled_time else None
        }
    )

    # 6. Trigger Celery Task immediately if "NOW"
    if data.schedule_type == "NOW":
        try:
            process_sms_campaign.delay(str(db_campaign.id))
        except Exception as e:
            from loguru import logger
            import asyncio
            from app.workers.tasks import run_process_campaign
            logger.warning(f"Could not queue via Celery ({e}), falling back to direct background execution")
            asyncio.create_task(run_process_campaign(str(db_campaign.id)))

    return {
        "success": True,
        "message": "Campaign created and queued successfully",
        "data": await format_campaign_dict(db, db_campaign),
        "errors": None
    }

@router.get("/{campaign_id}", response_model=None, dependencies=[Depends(require_viewer)])
async def get_campaign(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Get campaign details by ID.
    """
    db_campaign = await campaign_repository.get(db, id=campaign_id)
    if not db_campaign:
        raise NotFoundException(message="Campaign not found")
        
    return {
        "success": True,
        "message": "Campaign retrieved successfully",
        "data": await format_campaign_dict(db, db_campaign),
        "errors": None
    }

@router.delete("/{campaign_id}", response_model=None)
async def delete_campaign(
    campaign_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Cancel and soft-delete a campaign. Requires Operator permissions or higher.
    """
    require_operator(current_user)
    
    db_campaign = await campaign_repository.get(db, id=campaign_id)
    if not db_campaign:
        raise NotFoundException(message="Campaign not found")
        
    # Cancel campaign if it's queued or scheduled
    if db_campaign.status in [CampaignStatus.QUEUED, CampaignStatus.SCHEDULED]:
        db_campaign.status = CampaignStatus.CANCELLED
        db.add(db_campaign)

    await campaign_repository.remove(db, id=campaign_id, soft=True)
    
    # Audit Logging
    await audit_service.log_action(
        db,
        user_id=current_user.id,
        action="DELETE_CAMPAIGN",
        details={"campaign_id": str(campaign_id), "name": db_campaign.name}
    )
    return {
        "success": True,
        "message": "Campaign deleted and cancelled successfully",
        "data": None,
        "errors": None
    }

@router.post("/{campaign_id}/send", response_model=None)
async def send_campaign(
    campaign_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Manually trigger/send a scheduled or draft campaign immediately.
    """
    require_operator(current_user)
    
    db_campaign = await campaign_repository.get(db, id=campaign_id)
    if not db_campaign:
        raise NotFoundException(message="Campaign not found")
        
    if db_campaign.status not in [CampaignStatus.DRAFT, CampaignStatus.SCHEDULED]:
        raise BadRequestException(message="Only Draft or Scheduled campaigns can be manually triggered")

    db_campaign.status = CampaignStatus.QUEUED
    db.add(db_campaign)
    await db.commit()

    # Audit Logging
    await audit_service.log_action(
        db,
        user_id=current_user.id,
        action="SEND_CAMPAIGN",
        details={"campaign_id": str(campaign_id), "name": db_campaign.name}
    )

    # Trigger worker task
    try:
        process_sms_campaign.delay(str(db_campaign.id))
    except Exception as e:
        from loguru import logger
        import asyncio
        from app.workers.tasks import run_process_campaign
        logger.warning(f"Could not queue via Celery ({e}), falling back to direct background execution")
        asyncio.create_task(run_process_campaign(str(db_campaign.id)))

    return {
        "success": True,
        "message": "Campaign queued for sending",
        "data": CampaignResponse.model_validate(db_campaign),
        "errors": None
    }

@router.post("/{campaign_id}/retry-failed", response_model=None)
async def retry_campaign(
    campaign_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retry all failed recipient dispatches for a specific campaign.
    """
    require_operator(current_user)
    
    updated_campaign = await campaign_repository.retry_failed_recipients(db, campaign_id=campaign_id)
    if not updated_campaign:
        raise NotFoundException(message="Campaign not found or has no failed recipients")

    # Trigger background tasks to execute retries
    try:
        process_sms_campaign.delay(str(updated_campaign.id))
    except Exception as e:
        from loguru import logger
        import asyncio
        from app.workers.tasks import run_process_campaign
        logger.warning(f"Could not queue retry via Celery ({e}), falling back to direct background execution")
        asyncio.create_task(run_process_campaign(str(updated_campaign.id)))

    # Audit Logging
    await audit_service.log_action(
        db,
        user_id=current_user.id,
        action="RETRY_CAMPAIGN",
        details={"campaign_id": str(campaign_id), "name": updated_campaign.name}
    )

    return {
        "success": True,
        "message": "Campaign retries queued for sending",
        "data": CampaignResponse.model_validate(updated_campaign),
        "errors": None
    }

@router.put("/{campaign_id}", response_model=None)
async def update_campaign(
    campaign_id: uuid.UUID,
    data: CampaignUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update basic properties of a campaign. Requires Operator permissions or higher.
    """
    require_operator(current_user)
    
    db_campaign = await campaign_repository.get(db, id=campaign_id)
    if not db_campaign:
        raise NotFoundException(message="Campaign not found")
        
    updated = await campaign_repository.update(db, db_obj=db_campaign, obj_in=data)
    
    return {
        "success": True,
        "message": "Campaign updated successfully",
        "data": CampaignResponse.model_validate(updated),
        "errors": None
    }

