import uuid
from typing import List, Optional, Tuple
from sqlalchemy import select, func, or_, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.campaign import Campaign, CampaignRecipient, CampaignStatus, DeliveryStatus
from app.repositories.base import BaseRepository
from app.schemas.campaign import CampaignCreate, CampaignUpdate

class CampaignRepository(BaseRepository[Campaign, CampaignCreate, CampaignUpdate]):
    """
    Campaign repository managing campaigns, recipients, and delivery retries.
    """
    def __init__(self):
        super().__init__(Campaign)

    async def get_with_recipients(self, db: AsyncSession, id: uuid.UUID) -> Optional[Campaign]:
        """
        Load campaign along with its recipients and linked contact profiles.
        """
        query = (
            select(self.model)
            .where(self.model.id == id, self.model.is_deleted == False)
            .options(
                selectinload(self.model.recipients).selectinload(CampaignRecipient.contact)
            )
        )
        result = await db.execute(query)
        return result.scalars().first()

    async def search_campaigns(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        status: Optional[CampaignStatus] = None
    ) -> Tuple[List[Campaign], int]:
        """
        Search campaigns matching filters (name, status), with pagination.
        """
        query = select(self.model).where(self.model.is_deleted == False)

        if search:
            query = query.where(self.model.name.ilike(f"%{search}%"))

        if status:
            query = query.where(self.model.status == status)

        # Count total matches
        count_query = select(func.count()).select_from(query.subquery())
        count_result = await db.execute(count_query)
        total = count_result.scalar() or 0

        # Sort and Page
        query = query.order_by(self.model.created_at.desc()).offset(skip).limit(limit)
        result = await db.execute(query)
        items = list(result.scalars().all())

        return items, total

    async def retry_failed_recipients(self, db: AsyncSession, campaign_id: uuid.UUID) -> Optional[Campaign]:
        """
        Reset all failed recipients in a campaign back to PENDING and set campaign status to QUEUED.
        """
        campaign = await self.get_with_recipients(db, id=campaign_id)
        if not campaign:
            return None

        failed_recipients = [r for r in campaign.recipients if r.status == DeliveryStatus.FAILED]
        
        if not failed_recipients:
            return campaign

        # Reset states
        for rec in failed_recipients:
            rec.status = DeliveryStatus.PENDING
            rec.error_message = None
            db.add(rec)

        # Sync counters
        campaign.failed_count -= len(failed_recipients)
        campaign.pending_count += len(failed_recipients)
        campaign.status = CampaignStatus.QUEUED
        
        db.add(campaign)
        await db.commit()
        await db.refresh(campaign)
        return campaign

campaign_repository = CampaignRepository()
