from abc import ABC, abstractmethod
import asyncio
from datetime import datetime, timezone
import random
from typing import Any, Dict, List, Optional
import uuid
from loguru import logger

from app.models.campaign import DeliveryStatus

class SMSProvider(ABC):
    """
    Abstract Base Class for SMS Gateway Providers (Strategy Pattern).
    Allows replacing gateways (Twilio, Vonage, etc.) without altering business logic.
    """
    @abstractmethod
    async def send_sms(self, to_phone: str, message: str, sender_id: str) -> Dict[str, Any]:
        """
        Send a single SMS message.
        Returns a dictionary with delivery details: status, message_id, sent_at, error.
        """
        pass

    @abstractmethod
    async def send_bulk_sms(
        self,
        recipients: List[Dict[str, str]],
        message: str,
        sender_id: str
    ) -> List[Dict[str, Any]]:
        """
        Send bulk SMS messages.
        """
        pass

    @abstractmethod
    async def check_status(self, message_id: str) -> DeliveryStatus:
        """
        Query the gateway for the delivery status of a specific message ID.
        """
        pass

    @abstractmethod
    async def check_balance(self) -> int:
        """
        Retrieve remaining SMS account credits from the gateway provider.
        """
        pass

class MockSMSProvider(SMSProvider):
    """
    Simulated SMS Provider for local development.
    Prints to logs, simulates network delays and failure rates.
    """
    def __init__(self, failure_rate: float = 0.05):
        self.failure_rate = failure_rate

    async def send_sms(self, to_phone: str, message: str, sender_id: str) -> Dict[str, Any]:
        # Simulate network latency (200ms - 500ms)
        await asyncio.sleep(random.uniform(0.2, 0.5))
        
        message_id = str(uuid.uuid4())
        is_success = random.random() > self.failure_rate
        
        if is_success:
            logger.info(
                f"[MOCK GATEWAY] SMS Sent successfully to {to_phone} via sender '{sender_id}'. Message: {message}"
            )
            return {
                "message_id": message_id,
                "status": DeliveryStatus.DELIVERED,
                "sent_at": datetime.now(timezone.utc),
                "error_message": None
            }
        else:
            logger.warning(
                f"[MOCK GATEWAY] SMS Failed to {to_phone} via sender '{sender_id}'."
            )
            return {
                "message_id": message_id,
                "status": DeliveryStatus.FAILED,
                "sent_at": datetime.now(timezone.utc),
                "error_message": "Gateway Timeout / Subscriber Unreachable"
            }

    async def send_bulk_sms(
        self,
        recipients: List[Dict[str, str]],
        message: str,
        sender_id: str
    ) -> List[Dict[str, Any]]:
        results = []
        for r in recipients:
            res = await self.send_sms(
                to_phone=r["phone"],
                message=message,
                sender_id=sender_id
            )
            results.append({**r, **res})
        return results

    async def check_status(self, message_id: str) -> DeliveryStatus:
        return DeliveryStatus.DELIVERED

    async def check_balance(self) -> int:
        return 45000

class TwilioSMSProvider(SMSProvider):
    """
    Twilio SMS Provider adapter utilizing Twilio REST client libraries (concept implementation).
    """
    def __init__(self, account_sid: str, auth_token: str):
        self.account_sid = account_sid
        self.auth_token = auth_token

    async def send_sms(self, to_phone: str, message: str, sender_id: str) -> Dict[str, Any]:
        # Concrete implementation would call twilio REST API
        # from twilio.rest import Client
        # client = Client(self.account_sid, self.auth_token)
        # message = client.messages.create(body=message, from_=sender_id, to=to_phone)
        pass

    async def send_bulk_sms(
        self,
        recipients: List[Dict[str, str]],
        message: str,
        sender_id: str
    ) -> List[Dict[str, Any]]:
        pass

    async def check_status(self, message_id: str) -> DeliveryStatus:
        pass

    async def check_balance(self) -> int:
        # Twilio doesn't expose a standard credit balance endpoint for pay-as-you-go easily
        return 100000
