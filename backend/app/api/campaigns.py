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

router = APIRouter(prefix="/campaigns", tags=["Campaigns"])

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
    return {
        "success": True,
        "message": "Campaigns retrieved successfully",
        "data": {
            "items": [CampaignResponse.model_validate(item) for item in items],
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
    Retrieve details of a single campaign, including its stats.
    """
    campaign = await campaign_repository.get(db, id=campaign_id)
    if not campaign:
        raise NotFoundException(message="Campaign not found")
        
    return {
        "success": True,
        "message": "Campaign retrieved successfully",
        "data": CampaignResponse.model_validate(campaign),
        "errors": None
    }

@router.post("", response_model=None, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    data: CampaignCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new SMS Campaign, link target contacts (manual/group), and queue for dispatch.
    """
    require_operator(current_user)

    # 1. Resolve recipients contacts list
    contacts = []
    
    if data.recipient_source == "GROUPS":
        if not data.group_ids:
            raise BadRequestException(message="Group IDs are required when source is 'GROUPS'")
        
        # Select active contacts that belong to any of these group IDs
        query = select(Contact).join(group_contacts).where(
            group_contacts.c.group_id.in_(data.group_ids),
            Contact.is_deleted == False
        )
        res = await db.execute(query)
        contacts = list(res.scalars().all())
        
    elif data.recipient_source == "MANUAL":
        if not data.recipients:
            raise BadRequestException(message="Recipients list is required when source is 'MANUAL'")
            
        for r in data.recipients:
            norm_phone = file_service.normalize_phone(r.phone)
            if not norm_phone:
                continue
                
            contact = await contact_repository.get_by_phone(db, phone=norm_phone)
            if not contact:
                # Auto-create contact record
                names = r.name.split(" ", 1)
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
        raise BadRequestException(message="Invalid recipient source.")

    if not contacts:
        raise BadRequestException(message="No valid target contacts found for this campaign.")

    # Deduplicate contacts
    seen_ids = set()
    unique_contacts = []
    for c in contacts:
        if c.id not in seen_ids:
            seen_ids.add(c.id)
            unique_contacts.append(c)

    # 2. Insert Campaign record
    campaign_status = CampaignStatus.QUEUED if data.schedule_type == "NOW" else CampaignStatus.SCHEDULED
    
    campaign_data = {
        "name": data.name,
        "sender_id": data.sender_id,
        "message": data.message,
        "template_id": data.template_id,
        "status": campaign_status,
        "route": data.route_id,
        "scheduled_time": data.scheduled_at if data.schedule_type == "SCHEDULED" else None,
        "recipient_count": len(unique_contacts),
        "pending_count": len(unique_contacts),
        "sms_units": len(unique_contacts), # Simple calculation: 1 unit per recipient
        "created_by": current_user.id
    }
    
    db_campaign = await campaign_repository.create(db, obj_in=campaign_data)

    # 3. Create CampaignRecipient records
    for contact in unique_contacts:
        recipient = CampaignRecipient(
            campaign_id=db_campaign.id,
            contact_id=contact.id,
            status=DeliveryStatus.PENDING,
            sms_units=1
        )
        db.add(recipient)
        
    await db.commit()
    await db.refresh(db_campaign)

    # Audit Logging
    await audit_service.log_action(
        db,
        user_id=current_user.id,
        action="CREATE_CAMPAIGN",
        details={
            "campaign_id": str(db_campaign.id),
            "name": db_campaign.name,
            "recipient_count": db_campaign.recipient_count,
            "scheduled_time": str(db_campaign.scheduled_time) if db_campaign.scheduled_time else None
        }
    )

    # 4. Trigger Celery Task immediately if "NOW"
    if data.schedule_type == "NOW":
        process_sms_campaign.delay(str(db_campaign.id))

    return {
        "success": True,
        "message": "Campaign created and queued successfully",
        "data": CampaignResponse.model_validate(db_campaign),
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
    process_sms_campaign.delay(str(db_campaign.id))

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
    process_sms_campaign.delay(str(updated_campaign.id))

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

