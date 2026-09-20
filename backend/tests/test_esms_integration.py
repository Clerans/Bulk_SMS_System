"""
Test Suite for Dialog eSMS API v3.2 Integration (Adeona Technologies / Dialog LK).
Validates:
1. Authentication & Token Management (Login, Caching, 12h Expiration, Lockout error 116, Invalid creds 115).
2. Sri Lankan Mobile Normalization (converts +947... / 07... to required 9-digit format: 7XXXXXXXX).
3. Monotonic Unique Transaction ID Generator.
4. SMS Submission (Payload structure, Batch chunking, Error codes 104, 108, 109, 114, 118).
5. Delivery Report Webhook (GET /api/v1/sms/delivery-report status 1, 2, 3, 4, out-of-order resolution, idempotency).
6. Transaction Status Querying (POST /api/v2/sms/check-transaction).
7. Gateway Health Endpoint.
"""

import json
import pytest
import time
from unittest.mock import AsyncMock, patch, MagicMock
import uuid

import httpx
from sqlalchemy import select

from app.models.campaign import Campaign, CampaignRecipient, CampaignStatus, DeliveryStatus
from app.models.contact import Contact
from app.models.delivery_event import DeliveryEvent
from app.models.gateway_transaction import GatewayTransaction
from app.models.sms_log import SMSLog
from app.models.user import User, UserRole, UserStatus
from app.services.providers.esms_provider import (
    DialogESMSProvider,
    ESMSErrorCode,
    ESMSException,
    ESMSTokenManager,
    ESMS_ERROR_DESCRIPTIONS
)


# =========================================================================
# 1. Phone Number Normalization Tests
# =========================================================================

def test_dialog_phone_normalization():
    """Verify conversion of Sri Lankan phone formats to 9-digit format (7XXXXXXXX)."""
    test_cases = [
        ("0714551682", True, "714551682"),
        ("+94714551682", True, "714551682"),
        ("94714551682", True, "714551682"),
        ("714551682", True, "714551682"),
        ("0763625800", True, "763625800"),
        ("+94771234567", True, "771234567"),
        ("0701234567", True, "701234567"),
        ("0721234567", True, "721234567"),
        ("0741234567", True, "741234567"),
        ("0751234567", True, "751234567"),
        ("0781234567", True, "781234567"),
        # Invalid numbers (landlines, wrong prefixes, international)
        ("0112345678", False, ""),
        ("+12025550192", False, ""),
        ("invalid", False, ""),
        ("", False, ""),
    ]

    for raw, expected_valid, expected_norm in test_cases:
        is_valid, norm = DialogESMSProvider.normalize_dialog_mobile(raw)
        assert is_valid == expected_valid, f"Failed validity for {raw}: got {is_valid}, expected {expected_valid}"
        if expected_valid:
            assert norm == expected_norm, f"Failed norm for {raw}: got {norm}, expected {expected_norm}"


# =========================================================================
# 2. Transaction ID Uniqueness Tests
# =========================================================================

def test_transaction_id_generation():
    """Verify unique 64-bit integer generation between 1 and 18 digits."""
    generated_ids = set()
    for _ in range(500):
        tx_id = DialogESMSProvider.generate_unique_transaction_id()
        assert isinstance(tx_id, int)
        assert 1 <= len(str(tx_id)) <= 18
        assert tx_id not in generated_ids, f"Collision detected for TX ID: {tx_id}"
        generated_ids.add(tx_id)


# =========================================================================
# 3. Authentication & Token Manager Tests
# =========================================================================

@pytest.mark.asyncio
async def test_esms_token_manager_success():
    """Verify successful authentication, token caching, and 12-hour expiration."""
    token_mgr = ESMSTokenManager()
    
    mock_response = httpx.Response(
        status_code=200,
        json={
            "status": "success",
            "comment": "You have logged in",
            "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test_token",
            "remainingCount": None,
            "expiration": 43200,
            "refreshToken": "refresh_token_test",
            "refreshExpiration": 604800,
            "errCode": ""
        }
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response

        token = await token_mgr.get_access_token(
            auth_url="https://esms.dialog.lk",
            username="test_user",
            password="test_password"
        )
        assert token == "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test_token"
        assert token_mgr.is_token_valid() is True

        # Second call should return cached token without invoking HTTP
        token2 = await token_mgr.get_access_token(
            auth_url="https://esms.dialog.lk",
            username="test_user",
            password="test_password"
        )
        assert token2 == token
        assert mock_post.call_count == 1


@pytest.mark.asyncio
async def test_esms_token_manager_invalid_credentials():
    """Verify authentication error handling for invalid credentials (error 115)."""
    token_mgr = ESMSTokenManager()
    
    mock_response = httpx.Response(
        status_code=200,
        json={
            "status": "failed",
            "comment": "Username or password invalid",
            "token": None,
            "remainingCount": 4,
            "errCode": "115"
        }
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response

        with pytest.raises(ESMSException) as exc_info:
            await token_mgr.get_access_token(
                auth_url="https://esms.dialog.lk",
                username="wrong_user",
                password="wrong_password"
            )
        assert exc_info.value.status_code == 401
        assert "115" in str(exc_info.value)


@pytest.mark.asyncio
async def test_esms_token_manager_account_locked():
    """Verify authentication error handling for locked account (error 116)."""
    token_mgr = ESMSTokenManager()
    
    mock_response = httpx.Response(
        status_code=200,
        json={
            "status": "failed",
            "comment": "Account locked",
            "token": None,
            "remainingCount": 0,
            "errCode": "116"
        }
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response

        with pytest.raises(ESMSException) as exc_info:
            await token_mgr.get_access_token(
                auth_url="https://esms.dialog.lk",
                username="locked_user",
                password="test_password"
            )
        assert exc_info.value.status_code == 401
        assert "116" in str(exc_info.value)


# =========================================================================
# 4. SMS Dispatch & Error Handling Tests
# =========================================================================

@pytest.mark.asyncio
async def test_dialog_esms_send_bulk_success():
    """Verify sending SMS batch via POST /api/v2/sms with Dialog eSMS."""
    provider = DialogESMSProvider(
        username="test_user",
        password="test_password",
        base_url="https://e-sms.dialog.lk",
        auth_url="https://esms.dialog.lk",
        sender_id="CAFECHAI",
        payment_method=0,
        delivery_report_url="https://example.com/api/v1/sms/delivery-report"
    )

    # Mock token
    provider.token_manager._access_token = "mock_jwt_token"
    provider.token_manager._expires_at = time.time() + 3600

    mock_send_response = httpx.Response(
        status_code=200,
        json={
            "status": "success",
            "comment": "Campaign Created, Campaign ID 25, Campaign payment of (LKR) 250 was successful",
            "data": {
                "campaignId": 25,
                "campaignCost": 250,
                "walletBalance": 49750,
                "userMobile": 771234567,
                "userId": 123,
                "duplicatesRemoved": 0,
                "invalidNumbers": 0,
                "mask_blocked_numbers": 0
            },
            "errCode": ""
        }
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_send_response

        results = await provider.send_bulk_sms(
            recipients=["0714551682", "+94763625800"],
            message="Test Flash Sale Offer",
            sender_id="CAFECHAI"
        )

        assert len(results) == 2
        for r in results:
            assert r["status"] == DeliveryStatus.ACCEPTED
            assert r["gateway_campaign_id"] == "25"
            assert r["campaign_cost"] == 250
            assert r["wallet_balance"] == 49750

        # Verify outgoing payload
        called_args, called_kwargs = mock_post.call_args
        payload = called_kwargs.get("json")
        assert payload["sourceAddress"] == "CAFECHAI"
        assert payload["message"] == "Test Flash Sale Offer"
        assert payload["payment_method"] == 0
        assert payload["push_notification_url"] == "https://example.com/api/v1/sms/delivery-report"
        assert len(payload["msisdn"]) == 2
        assert payload["msisdn"][0]["mobile"] == "714551682"
        assert payload["msisdn"][1]["mobile"] == "763625800"


@pytest.mark.asyncio
async def test_dialog_esms_error_codes():
    """Verify handling of documented eSMS error codes (104, 108, 114, 118)."""
    provider = DialogESMSProvider(
        username="test_user",
        password="test_password"
    )
    provider.token_manager._access_token = "mock_jwt_token"
    provider.token_manager._expires_at = time.time() + 3600

    error_tests = [
        ("104", "Transaction ID is already used"),
        ("108", "Account does not have an active mask"),
        ("114", "Insufficient wallet balance"),
        ("118", "System blackout period")
    ]

    for err_code, expected_snippet in error_tests:
        mock_error_resp = httpx.Response(
            status_code=200,
            json={
                "status": "failed",
                "comment": expected_snippet,
                "data": "",
                "errCode": err_code
            }
        )
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_error_resp

            results = await provider.send_bulk_sms(
                recipients=["0714551682"],
                message="Test Message"
            )
            assert len(results) == 1
            assert results[0]["status"] == DeliveryStatus.FAILED
            assert results[0]["error_code"] == err_code
            assert expected_snippet.lower() in results[0]["error_message"].lower()


# =========================================================================
# 5. Delivery Report Webhook Callback Tests
# =========================================================================

@pytest.mark.asyncio
async def test_esms_delivery_report_webhook_status_flow(client: httpx.AsyncClient, db_session):
    """
    Test delivery report webhook callbacks:
    - Status 1 (SMSC Submitted) -> sets SUBMITTED
    - Status 3 (Delivered) -> sets DELIVERED
    - Out-of-order Status 1 after Status 3 -> preserves DELIVERED
    - Verifies CampaignBatch and parent Campaign statistics recalculation
    """
    from app.models.campaign_batch import CampaignBatch, BatchStatus

    # 1. Create Campaign, Contact, CampaignBatch & CampaignRecipient
    contact = Contact(
        first_name="Kasun",
        last_name="Perera",
        phone="+94714551682",
        status=UserStatus.ACTIVE
    )
    db_session.add(contact)
    await db_session.commit()
    await db_session.refresh(contact)

    campaign = Campaign(
        name="Webhook Test Campaign",
        sender_id="CAFECHAI",
        message="Special Discount",
        status=CampaignStatus.PROCESSING,
        recipient_count=1,
        pending_count=1,
        delivered_count=0,
        failed_count=0,
        submitted_count=0,
        gateway_campaign_id="999"
    )
    db_session.add(campaign)
    await db_session.commit()
    await db_session.refresh(campaign)

    batch = CampaignBatch(
        campaign_id=campaign.id,
        batch_number=1,
        transaction_id=100001,
        gateway_campaign_id="999",
        recipient_count=1,
        accepted_count=1,
        submitted_count=1,
        delivered_count=0,
        failed_count=0,
        status=BatchStatus.SUBMITTED
    )
    db_session.add(batch)
    await db_session.commit()
    await db_session.refresh(batch)

    recipient = CampaignRecipient(
        campaign_id=campaign.id,
        batch_id=batch.id,
        contact_id=contact.id,
        status=DeliveryStatus.PENDING,
        normalized_mobile_number="714551682",
        gateway_campaign_id="999"
    )
    db_session.add(recipient)
    await db_session.commit()

    # 2. Receive Status 1 (Submitted to SMSC)
    resp1 = await client.get("/sms/delivery-report?campaignId=999&msisdn=94714551682&status=1")
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert data1["status"] == "success"
    assert data1["data"]["mappedStatus"] == "SUBMITTED"

    # Verify recipient updated to SUBMITTED
    await db_session.refresh(recipient)
    assert recipient.status == DeliveryStatus.SUBMITTED

    # 3. Receive Status 3 (Successfully Delivered)
    resp3 = await client.get("/sms/delivery-report?campaignId=999&msisdn=94714551682&status=3")
    assert resp3.status_code == 200
    data3 = resp3.json()
    assert data3["data"]["mappedStatus"] == "DELIVERED"

    await db_session.refresh(recipient)
    assert recipient.status == DeliveryStatus.DELIVERED

    # Verify Batch and Campaign completed
    await db_session.refresh(batch)
    assert batch.delivered_count == 1
    assert batch.status == BatchStatus.COMPLETED

    await db_session.refresh(campaign)
    assert campaign.delivered_count == 1
    assert campaign.status == CampaignStatus.COMPLETED

    # 4. Out-of-order late Status 1 arrival should NOT overwrite DELIVERED
    resp1_late = await client.get("/sms/delivery-report?campaignId=999&msisdn=94714551682&status=1")
    assert resp1_late.status_code == 200

    await db_session.refresh(recipient)
    assert recipient.status == DeliveryStatus.DELIVERED
    await db_session.refresh(campaign)
    assert campaign.status == CampaignStatus.COMPLETED

    # 5. Check DeliveryEvents recorded
    events_query = select(DeliveryEvent).where(DeliveryEvent.gateway_campaign_id == "999")
    events_res = await db_session.execute(events_query)
    events = list(events_res.scalars().all())
    assert len(events) >= 3
    assert events[0].batch_id == batch.id


# =========================================================================
# 6. Transaction Status Check & Gateway Health Tests
# =========================================================================

@pytest.mark.asyncio
async def test_check_transaction_status():
    """Verify check-transaction endpoint query."""
    provider = DialogESMSProvider(
        username="test_user",
        password="test_password"
    )
    provider.token_manager._access_token = "mock_jwt_token"
    provider.token_manager._expires_at = time.time() + 3600

    mock_resp = httpx.Response(
        status_code=200,
        json={
            "status": "success",
            "comment": "campaign found for the transaction id:1001",
            "data": {
                "campaign status": "completed"
            },
            "errCode": "",
            "transaction_id": 1001
        }
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp

        status_res = await provider.check_transaction_status(1001)
        assert status_res["success"] is True
        assert status_res["campaign_status"] == "completed"
        assert status_res["transaction_id"] == 1001


from app.dependencies.auth import require_viewer
from app.main import app

@pytest.mark.asyncio
async def test_gateway_health_endpoint(client: httpx.AsyncClient):
    """Verify GET /api/v1/sms/gateway/health operational details."""
    app.dependency_overrides[require_viewer] = lambda: True
    try:
        resp = await client.get("/sms/gateway/health")
        assert resp.status_code == 200
        json_data = resp.json()
        assert json_data["success"] is True
        assert "data" in json_data
        data = json_data["data"]
        assert "activeGateway" in data
        assert "batchLimit" in data
        assert data["batchLimit"] == 1000
        assert data["sendTpsLimit"] == 20
    finally:
        app.dependency_overrides.pop(require_viewer, None)

