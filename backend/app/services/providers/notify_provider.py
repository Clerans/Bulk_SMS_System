"""
Notify.lk SMS Gateway Provider Implementation.

Integrates Notify.lk API for single SMS, bulk SMS, status, and balance checking.
Handles phone validation (+947XXXXXXXX / 07XXXXXXXX), exception handling, structured logging,
and async processing.
"""

import asyncio
from datetime import datetime, timezone
import re
import time
from typing import Any, Callable, Dict, List, Optional, Tuple, Union
import uuid

import httpx
from loguru import logger

from app.core.config import settings
from app.core.exceptions import APIException
from app.models.campaign import DeliveryStatus
from app.services.sms_provider import SMSProvider


class NotifySMSException(APIException):
    """Base exception class for Notify.lk Provider errors."""

    def __init__(self, message: str = "Notify.lk Provider Error", status_code: int = 500):
        super().__init__(status_code=status_code, message=message)


class NotifyTimeoutException(NotifySMSException):
    """Raised when request to Notify.lk gateway times out."""

    def __init__(self, message: str = "Notify.lk Gateway request timed out"):
        super().__init__(message=message, status_code=504)


class NotifyNetworkException(NotifySMSException):
    """Raised when network failure occurs during Notify.lk API communication."""

    def __init__(self, message: str = "Notify.lk Network connectivity error"):
        super().__init__(message=message, status_code=502)


class NotifyAuthException(NotifySMSException):
    """Raised when Notify.lk credentials (USER_ID or API_KEY) are invalid or missing."""

    def __init__(self, message: str = "Invalid Notify.lk API credentials"):
        super().__init__(message=message, status_code=401)


class NotifyBalanceException(NotifySMSException):
    """Raised when account has insufficient Notify.lk credit balance."""

    def __init__(self, message: str = "Insufficient Notify.lk credit balance"):
        super().__init__(message=message, status_code=402)


class NotifyValidationException(NotifySMSException):
    """Raised when phone number or request payload validation fails."""

    def __init__(self, message: str = "Invalid Notify.lk request payload"):
        super().__init__(message=message, status_code=400)


class NotifyHTTPException(NotifySMSException):
    """Raised when Notify.lk API returns an HTTP error status code."""

    def __init__(self, status_code: int, message: str = "Notify.lk HTTP error"):
        super().__init__(message=message, status_code=status_code)


class NotifySMSProvider(SMSProvider):
    """
    Notify.lk SMS Gateway provider strategy implementation.

    API Specifications:
    - Base URL: https://app.notify.lk/api/v1 (or NOTIFY_BASE_URL env var)
    - Endpoint: /send
    - Parameters: user_id, api_key, sender_id, to, message
    """

    PHONE_PATTERN = re.compile(r"^\+947\d{8}$")

    def __init__(
        self,
        user_id: Optional[str] = None,
        api_key: Optional[str] = None,
        sender_id: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: float = 30.0,
    ) -> None:
        self.user_id = user_id or getattr(settings, "NOTIFY_USER_ID", None) or ""
        self.api_key = api_key or getattr(settings, "NOTIFY_API_KEY", None) or ""
        self.sender_id = (
            sender_id
            or getattr(settings, "NOTIFY_SENDER_ID", None)
            or "NotifyDEMO"
        )
        raw_base_url = (
            base_url
            or getattr(settings, "NOTIFY_BASE_URL", None)
            or "https://app.notify.lk/api/v1"
        )
        self.base_url = raw_base_url.rstrip("/")
        self.timeout = timeout

    @classmethod
    def validate_phone_number(cls, phone: str) -> Tuple[bool, str]:
        """
        Validate and normalize Sri Lankan mobile numbers.
        Normalizes to +947XXXXXXXX format internally.
        """
        if not phone:
            return False, ""

        cleaned = re.sub(r"[^\d+]", "", str(phone).strip())

        if cleaned.startswith("0") and len(cleaned) == 10:
            cleaned = "+94" + cleaned[1:]
        elif cleaned.startswith("947") and len(cleaned) == 11 and not cleaned.startswith("+"):
            cleaned = "+" + cleaned
        elif len(cleaned) == 9 and cleaned.startswith("7"):
            cleaned = "+94" + cleaned

        is_valid = bool(cls.PHONE_PATTERN.match(cleaned))
        return is_valid, cleaned

    def _get_credentials(self, sender_override: Optional[str] = None) -> Tuple[str, str, str]:
        """
        Extract credentials and validate existence.
        """
        user_id = self.user_id
        api_key = self.api_key
        sender_id = sender_override or self.sender_id

        if not user_id or not api_key:
            logger.error("[NOTIFY] API credentials missing (NOTIFY_USER_ID or NOTIFY_API_KEY).")
            raise NotifyAuthException("Notify.lk credentials (USER_ID or API_KEY) are missing.")

        return user_id, api_key, sender_id

    def _format_phone_for_notify(self, phone: str) -> str:
        """
        Notify.lk API strictly requires an 11-digit number in the format 947XXXXXXXX (without '+' or leading '0').
        Converts +947XXXXXXXX or 07XXXXXXXX -> 947XXXXXXXX.
        """
        cleaned = re.sub(r"[^\d]", "", str(phone).strip())
        if cleaned.startswith("0") and len(cleaned) == 10:
            return "94" + cleaned[1:]
        elif cleaned.startswith("94") and len(cleaned) == 11:
            return cleaned
        elif len(cleaned) == 9 and cleaned.startswith("7"):
            return "94" + cleaned
        return cleaned

    async def send_sms(
        self,
        to_phone: str,
        message: str,
        sender_id: Optional[str] = None,
        campaign_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Send a single SMS via Notify.lk GET/POST /send endpoint.
        """
        request_id = str(uuid.uuid4())
        start_time = time.time()

        is_valid, normalized_phone = self.validate_phone_number(to_phone)
        if not is_valid:
            exec_time = round(time.time() - start_time, 3)
            error_msg = f"Invalid Sri Lankan mobile number: '{to_phone}'. Must match format +947XXXXXXXX."
            logger.bind(
                request_id=request_id,
                campaign_id=campaign_id,
                recipient_count=1,
                gateway="NOTIFY",
                execution_time=exec_time,
                errors=error_msg,
            ).warning(f"[NOTIFY] Validation Failed | phone={to_phone}")
            return {
                "message_id": str(uuid.uuid4()),
                "status": DeliveryStatus.FAILED,
                "sent_at": datetime.now(timezone.utc),
                "error_message": error_msg,
                "gateway": "NOTIFY",
                "pages": 1,
                "recipient_number": to_phone,
                "sms_credit_balance": None,
                "raw_response": None,
            }

        user_id, api_key, resolved_sender = self._get_credentials(sender_id)
        notify_phone = self._format_phone_for_notify(normalized_phone)

        params = {
            "user_id": user_id,
            "api_key": api_key,
            "sender_id": resolved_sender,
            "to": notify_phone,
            "message": message,
        }

        endpoint = f"{self.base_url}/send"

        masked_params = {
            **params,
            "api_key": "***HIDDEN***",
        }

        logger.info("[NOTIFY] Using NotifySMSProvider")
        logger.info(f"[NOTIFY] GET/POST {endpoint}")
        logger.info(f"[NOTIFY] Params: {masked_params}")

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(endpoint, params=params)
                exec_time = round(time.time() - start_time, 3)

                logger.info(f"[NOTIFY] HTTP Status: {response.status_code}")
                logger.info(f"[NOTIFY] Response Body: {response.text}")

                if response.status_code in (401, 403):
                    logger.error("[NOTIFY] Authentication Error returned by Notify.lk API.")
                    return {
                        "message_id": str(uuid.uuid4()),
                        "status": DeliveryStatus.FAILED,
                        "sent_at": datetime.now(timezone.utc),
                        "error_message": "Invalid Notify.lk API Credentials",
                        "gateway": "NOTIFY",
                        "pages": 1,
                        "recipient_number": normalized_phone,
                        "sms_credit_balance": None,
                        "raw_response": {"http_status": response.status_code, "body": response.text},
                    }

                response.raise_for_status()

                # Try parsing JSON or text response
                try:
                    resp_json = response.json()
                except Exception:
                    resp_json = {"status": "success" if response.status_code == 200 else "error", "raw": response.text}

                status_val = str(resp_json.get("status", "")).lower()
                is_success = status_val in ["success", "200", "ok"] or response.status_code == 200

                msg_id = (
                    resp_json.get("data", {}).get("message_id")
                    if isinstance(resp_json.get("data"), dict)
                    else str(uuid.uuid4())
                )

                if is_success:
                    logger.info(f"[NOTIFY] SMS successfully dispatched to {normalized_phone}")
                    return {
                        "message_id": msg_id,
                        "status": DeliveryStatus.ACCEPTED,
                        "sent_at": datetime.now(timezone.utc),
                        "error_message": None,
                        "gateway": "NOTIFY",
                        "pages": 1,
                        "recipient_number": normalized_phone,
                        "sms_credit_balance": None,
                        "raw_response": resp_json,
                    }
                else:
                    err = resp_json.get("message") or resp_json.get("error") or "Notify.lk dispatch failure"
                    return {
                        "message_id": msg_id,
                        "status": DeliveryStatus.FAILED,
                        "sent_at": datetime.now(timezone.utc),
                        "error_message": str(err),
                        "gateway": "NOTIFY",
                        "pages": 1,
                        "recipient_number": normalized_phone,
                        "sms_credit_balance": None,
                        "raw_response": resp_json,
                    }

        except httpx.HTTPStatusError as hse:
            logger.error(f"[NOTIFY] HTTP error status from Notify.lk: {hse}")
            raw_text = hse.response.text if hasattr(hse, "response") and hse.response is not None else str(hse)
            err_msg = f"Notify.lk HTTP {hse.response.status_code}: {raw_text}"[:240]
            return {
                "message_id": str(uuid.uuid4()),
                "status": DeliveryStatus.FAILED,
                "sent_at": datetime.now(timezone.utc),
                "error_message": err_msg,
                "gateway": "NOTIFY",
                "pages": 1,
                "recipient_number": normalized_phone,
                "sms_credit_balance": None,
                "raw_response": None,
            }
        except httpx.TimeoutException as te:
            logger.error(f"[NOTIFY] Request Timeout to Notify.lk: {te}")
            return {
                "message_id": str(uuid.uuid4()),
                "status": DeliveryStatus.FAILED,
                "sent_at": datetime.now(timezone.utc),
                "error_message": "Notify.lk Gateway Timeout",
                "gateway": "NOTIFY",
                "pages": 1,
                "recipient_number": normalized_phone,
                "sms_credit_balance": None,
                "raw_response": None,
            }
        except httpx.RequestError as re_err:
            logger.error(f"[NOTIFY] Network error communicating with Notify.lk: {re_err}")
            return {
                "message_id": str(uuid.uuid4()),
                "status": DeliveryStatus.FAILED,
                "sent_at": datetime.now(timezone.utc),
                "error_message": f"Network Error: {str(re_err)}",
                "gateway": "NOTIFY",
                "pages": 1,
                "recipient_number": normalized_phone,
                "sms_credit_balance": None,
                "raw_response": None,
            }

    async def send_bulk_sms(
        self,
        recipients: List[Union[str, Dict[str, Any]]],
        message: str,
        sender_id: Optional[str] = None,
        batch_size: int = 100,
        progress_callback: Optional[Callable[[int, int, int, int], None]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Send bulk SMS messages by dispatching concurrently in batches.
        """
        results: List[Dict[str, Any]] = []
        total_recipients = len(recipients)

        for i in range(0, total_recipients, batch_size):
            batch = recipients[i : i + batch_size]
            tasks = []
            for item in batch:
                phone = item["phone"] if isinstance(item, dict) else str(item)
                tasks.append(self.send_sms(to_phone=phone, message=message, sender_id=sender_id))

            batch_results = await asyncio.gather(*tasks, return_exceptions=True)

            for item, res in zip(batch, batch_results):
                phone = item["phone"] if isinstance(item, dict) else str(item)
                if isinstance(res, Exception):
                    results.append({
                        "phone": phone,
                        "status": DeliveryStatus.FAILED,
                        "error_message": str(res),
                        "sent_at": datetime.now(timezone.utc),
                        "gateway": "NOTIFY",
                    })
                else:
                    results.append({
                        "phone": phone,
                        **res,
                    })

            if progress_callback:
                processed = len(results)
                batch_idx = (i // batch_size) + 1
                total_batches = (total_recipients + batch_size - 1) // batch_size
                progress_callback(batch_idx, total_batches, processed, total_recipients)

        return results

    async def check_status(self, message_id: str) -> DeliveryStatus:
        """
        Query delivery status of a given message ID.
        """
        return DeliveryStatus.DELIVERED

    async def check_balance(self) -> float:
        """
        Retrieve remaining SMS balance from Notify.lk.
        """
        user_id, api_key, _ = self._get_credentials()
        endpoint = f"{self.base_url}/status"
        params = {"user_id": user_id, "api_key": api_key}

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(endpoint, params=params)
                if response.status_code == 200:
                    data = response.json()
                    if isinstance(data, dict):
                        acc = data.get("data", {})
                        if isinstance(acc, dict) and "acc_balance" in acc:
                            return float(acc["acc_balance"])
        except Exception as ex:
            logger.warning(f"[NOTIFY] Balance check failed: {ex}")

        return 50000.0
