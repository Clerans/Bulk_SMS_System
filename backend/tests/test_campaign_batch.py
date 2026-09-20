"""
Tests for Multi-Batch Campaign Processing, Recipient Sources, and Celery Schedulers.
"""

from datetime import datetime, timezone, timedelta
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import uuid
import httpx
from sqlalchemy import select

from app.models.campaign import Campaign, CampaignRecipient, CampaignStatus, DeliveryStatus
from app.models.campaign_batch import CampaignBatch, BatchStatus
from app.models.contact import Contact
from app.models.group import Group, group_contacts
from app.models.setting import Setting
from app.models.user import User, UserRole, UserStatus
from app.repositories.setting import setting_repository
from app.workers.tasks import run_process_campaign, run_check_scheduled_campaigns
from app.services.providers.esms_provider import DialogESMSProvider


@pytest.mark.asyncio
async def test_campaign_batch_splitting(db_session):
    """
    Verify that a campaign with 2,500 recipients is split into 3 batches (1000, 1000, 500)
    with unique transaction IDs and linked to the parent Campaign.
    """
    # 1. Setup App Settings with plenty of credits
    app_settings = await setting_repository.get_settings(db_session)
    app_settings.sms_balance = 50000
    db_session.add(app_settings)
    await db_session.commit()

    # 2. Create Campaign with 2500 recipients
    campaign = Campaign(
        name="Big Bulk Campaign",
        sender_id="UMG Lanka",
        message="Seasonal Special Offer",
        status=CampaignStatus.QUEUED,
        recipient_count=2500,
        pending_count=2500,
        sms_units=2500
    )
    db_session.add(campaign)
    await db_session.commit()
    await db_session.refresh(campaign)

    # Add 2500 contacts and recipients
    for i in range(2500):
        c = Contact(
            first_name=f"User{i}",
            last_name="Test",
            phone=f"077{i:07d}",
            status=UserStatus.ACTIVE
        )
        db_session.add(c)
        await db_session.flush()

        rec = CampaignRecipient(
            campaign_id=campaign.id,
            contact_id=c.id,
            status=DeliveryStatus.PENDING,
            sms_units=1,
            normalized_mobile_number=f"77{i:07d}"
        )
        db_session.add(rec)

    await db_session.commit()

    # 3. Mock Dialog eSMS HTTP POST calls
    mock_responses = [
        {"status": "success", "comment": "Batch 1 accepted", "data": {"campaignId": 101, "campaignCost": 1000}},
        {"status": "success", "comment": "Batch 2 accepted", "data": {"campaignId": 102, "campaignCost": 1000}},
        {"status": "success", "comment": "Batch 3 accepted", "data": {"campaignId": 103, "campaignCost": 500}},
    ]

    with patch.object(DialogESMSProvider, "_execute_post_sms", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = [
            {
                "status": DeliveryStatus.ACCEPTED,
                "gateway_campaign_id": "101",
                "campaign_cost": 1000.0,
                "raw_response": mock_responses[0]
            },
            {
                "status": DeliveryStatus.ACCEPTED,
                "gateway_campaign_id": "102",
                "campaign_cost": 1000.0,
                "raw_response": mock_responses[1]
            },
            {
                "status": DeliveryStatus.ACCEPTED,
                "gateway_campaign_id": "103",
                "campaign_cost": 500.0,
                "raw_response": mock_responses[2]
            }
        ]

        await run_process_campaign(str(campaign.id))

    # 4. Verify 3 batches were created
    batches_q = select(CampaignBatch).where(CampaignBatch.campaign_id == campaign.id).order_by(CampaignBatch.batch_number)
    b_res = await db_session.execute(batches_q)
    batches = list(b_res.scalars().all())

    assert len(batches) == 3
    assert batches[0].batch_number == 1
    assert batches[0].recipient_count == 1000
    assert batches[0].gateway_campaign_id == "101"
    assert batches[0].status == BatchStatus.SUBMITTED

    assert batches[1].batch_number == 2
    assert batches[1].recipient_count == 1000
    assert batches[1].gateway_campaign_id == "102"
    assert batches[1].status == BatchStatus.SUBMITTED

    assert batches[2].batch_number == 3
    assert batches[2].recipient_count == 500
    assert batches[2].gateway_campaign_id == "103"
    assert batches[2].status == BatchStatus.SUBMITTED

    # Verify transaction IDs are unique
    tx_ids = {b.transaction_id for b in batches}
    assert len(tx_ids) == 3

    # Verify campaign status is SUBMITTED (awaiting webhook delivery reports)
    await db_session.refresh(campaign)
    assert campaign.status == CampaignStatus.SUBMITTED
    assert campaign.submitted_count == 2500


@pytest.mark.asyncio
async def test_scheduled_campaign_worker(db_session):
    """
    Verify scheduled campaigns past due are claimed and triggered.
    """
    # 1. Create a campaign scheduled 5 minutes ago
    past_time = datetime.now(timezone.utc) - timedelta(minutes=5)
    campaign = Campaign(
        name="Scheduled Past Campaign",
        sender_id="UMG Lanka",
        message="Hello Scheduled!",
        status=CampaignStatus.SCHEDULED,
        scheduled_time=past_time,
        recipient_count=10,
        sms_units=10
    )
    db_session.add(campaign)
    await db_session.commit()
    await db_session.refresh(campaign)

    # 2. Run scheduled campaigns check
    with patch("app.workers.tasks.process_sms_campaign.delay") as mock_delay:
        await run_check_scheduled_campaigns()
        
        # Verify campaign status changed to QUEUED and delay was called
        await db_session.refresh(campaign)
        assert campaign.status == CampaignStatus.QUEUED
        assert mock_delay.called
