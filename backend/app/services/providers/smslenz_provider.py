"""
SMSlenz SMS Gateway Provider Implementation.

Integrates SMSlenz.lk API for single SMS, bulk SMS, and account status management.
Handles phone validation (+947XXXXXXXX), exception handling, structured logging,
and async batch processing for large volumes without blocking the FastAPI event loop.
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


class SMSProviderException(APIException):
    """Base exception class for SMS Provider errors."""

    def __init__(self, message: str = "SMS Provider Error", status_code: int = 500):
        super().__init__(status_code=status_code, message=message)


class SMSLenzTimeoutException(SMSProviderException):
    """Raised when request to SMSlenz gateway times out."""

    def __init__(self, message: str = "SMSlenz Gateway request timed out"):
        super().__init__(message=message, status_code=504)


class SMSLenzNetworkException(SMSProviderException):
    """Raised when network failure occurs during SMSlenz API communication."""

    def __init__(self, message: str = "SMSlenz Network connectivity error"):
        super().__init__(message=message, status_code=502)


class SMSLenzAuthException(SMSProviderException):
    """Raised when SMSlenz credentials (USER_ID or API_KEY) are invalid or missing."""

    def __init__(self, message: str = "Invalid SMSlenz API credentials"):
        super().__init__(message=message, status_code=401)


class SMSLenzBalanceException(SMSProviderException):
    """Raised when account has insufficient SMS credit balance."""

    def __init__(self, message: str = "Insufficient SMSlenz credit balance"):
        super().__init__(message=message, status_code=402)


class SMSLenzValidationException(SMSProviderException):
    """Raised when phone number or request payload validation fails."""

    def __init__(self, message: str = "Invalid SMSlenz request payload"):
        super().__init__(message=message, status_code=400)


class SMSLenzHTTPException(SMSProviderException):
    """Raised when SMSlenz API returns an HTTP error status code."""

    def __init__(self, status_code: int, message: str = "SMSlenz HTTP error"):
        super().__init__(message=message, status_code=status_code)


class SMSLenzProvider(SMSProvider):
    """
    SMSlenz.lk SMS Gateway provider strategy implementation.

    API Specifications:
    - Base URL: https://smslenz.lk/api (or SMSLENZ_BASE_URL env var)
    - Authentication: user_id, api_key
    - Supported endpoints: /send-sms, /send-bulk-sms, /account-status
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
        self.user_id = user_id or getattr(settings, "SMSLENZ_USER_ID", None) or ""
        self.api_key = api_key or getattr(settings, "SMSLENZ_API_KEY", None) or ""
        self.sender_id = (
            sender_id
            or getattr(settings, "SMSLENZ_SENDER_ID", None)
            or "CAFECHAI"
        )
        raw_base_url = (
            base_url
            or getattr(settings, "SMSLENZ_BASE_URL", None)
            or "https://smslenz.lk/api"
        )
        self.base_url = raw_base_url.rstrip("/")
        self.timeout = timeout

    @classmethod
    def validate_phone_number(cls, phone: str) -> Tuple[bool, str]:
        """
        Validate and normalize Sri Lankan mobile numbers.
        Accepts only +947XXXXXXXX (e.g. +94771234567).
        Automatically converts local formats (0771234567, 94771234567) to +947XXXXXXXX.

        Returns (is_valid, normalized_phone).
        """
        if not phone:
            return False, ""

        cleaned = re.sub(r"[^\d+]", "", str(phone).strip())

        # Normalize 077XXXXXXX -> +9477XXXXXXX
        if cleaned.startswith("0") and len(cleaned) == 10:
            cleaned = "+94" + cleaned[1:]

        # Normalize 9477XXXXXXX -> +9477XXXXXXX
        elif cleaned.startswith("947") and len(cleaned) == 11 and not cleaned.startswith("+"):
            cleaned = "+" + cleaned

        # Normalize 77XXXXXXX -> +9477XXXXXXX
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
            logger.error("[SMSLENZ] API credentials missing (SMSLENZ_USER_ID or SMSLENZ_API_KEY).")
            raise SMSLenzAuthException("SMSlenz credentials (USER_ID or API_KEY) are missing.")

        return user_id, api_key, sender_id

    async def send_sms(
        self,
        to_phone: str,
        message: str,
        sender_id: Optional[str] = None,
        campaign_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Send a single SMS via SMSlenz POST /send-sms endpoint.
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
                gateway="SMSLENZ",
                execution_time=exec_time,
                errors=error_msg,
            ).warning(f"[SMSLENZ] Validation Failed | phone={to_phone}")
            return {
                "message_id": str(uuid.uuid4()),
                "status": DeliveryStatus.FAILED,
                "sent_at": datetime.now(timezone.utc),
                "error_message": error_msg,
                "gateway": "SMSLENZ",
                "pages": 1,
                "recipient_number": to_phone,
                "sms_credit_balance": None,
                "raw_response": None,
            }

        user_id, api_key, resolved_sender = self._get_credentials(sender_id)

        payload = {
            "user_id": user_id,
            "api_key": api_key,
            "sender_id": resolved_sender,
            "contact": normalized_phone,
            "message": message,
        }

        endpoint = f"{self.base_url}/send-sms"

        masked_payload = {
            "user_id": user_id,
            "api_key": "***HIDDEN***",
            "sender_id": resolved_sender,
            "contact": normalized_phone,
            "message": message
        }

        logger.info("[SMSLENZ] Using SMSLenzProvider")
        logger.info(f"[SMSLENZ] POST {endpoint}")
        logger.info(f"[SMSLENZ] Payload: {masked_payload}")
        print(f"Using SMSLenzProvider\nPOST {endpoint}\nPayload: {masked_payload}")

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(endpoint, json=payload)
                exec_time = round(time.time() - start_time, 3)

                logger.info(f"[SMSLENZ] HTTP Status: {response.status_code}")
                logger.info(f"[SMSLENZ] Response Body: {response.text}")
                print(f"[SMSLENZ] HTTP Status: {response.status_code}\n[SMSLENZ] Response Body: {response.text}")

                if response.status_code in (401, 403):
                    logger.bind(
                        request_id=request_id,
                        campaign_id=campaign_id,
                        recipient_count=1,
                        gateway="SMSLENZ",
                        execution_time=exec_time,
                        errors=response.text,
                    ).error("[SMSLENZ] Authentication Error returned by SMSlenz API.")
                    return {
                        "message_id": str(uuid.uuid4()),
                        "status": DeliveryStatus.FAILED,
                        "sent_at": datetime.now(timezone.utc),
                        "error_message": "Invalid SMSlenz API Credentials",
                        "gateway": "SMSLENZ",
                        "pages": 1,
                        "recipient_number": normalized_phone,
                        "sms_credit_balance": None,
                        "raw_response": {"http_status": response.status_code, "body": response.text},
                    }

                response.raise_for_status()
                resp_json = response.json()
                logger.info(f"[SMSLENZ] JSON Response: {resp_json}")
                print(f"[SMSLENZ] JSON Response: {resp_json}")

                success = resp_json.get("success", False)
                res_data = resp_json.get("data") or {}
                res_status = str(res_data.get("status", "")).lower()

                if success or res_status == "success":
                    credit_bal_str = res_data.get("sms_credit_balance")
                    credit_bal = float(credit_bal_str) if credit_bal_str is not None else None
                    msg_id = str(res_data.get("campaign_id") or uuid.uuid4())
                    pages = int(res_data.get("pages", 1))

                    logger.bind(
                        request_id=request_id,
                        campaign_id=campaign_id,
                        recipient_count=1,
                        gateway="SMSLENZ",
                        execution_time=exec_time,
                        errors=None,
                    ).info(f"[SMSLENZ] Single SMS Sent | phone={normalized_phone} | campaign_id={msg_id} | exec_time={exec_time}s")

                    return {
                        "message_id": msg_id,
                        "status": DeliveryStatus.ACCEPTED,
                        "sent_at": datetime.now(timezone.utc),
                        "error_message": None,
                        "gateway": "SMSLENZ",
                        "pages": pages,
                        "recipient_number": res_data.get("recipient_number", normalized_phone),
                        "sms_credit_balance": credit_bal,
                        "charged_from": res_data.get("charged_from", "main"),
                        "raw_response": resp_json,
                    }
                else:
                    err_msg = resp_json.get("message") or res_data.get("message") or "Failed to send SMS"
                    logger.bind(
                        request_id=request_id,
                        campaign_id=campaign_id,
                        recipient_count=1,
                        gateway="SMSLENZ",
                        execution_time=exec_time,
                        errors=err_msg,
                    ).warning(f"[SMSLENZ] SMS Dispatch Failed | phone={normalized_phone} | reason={err_msg}")

                    return {
                        "message_id": str(uuid.uuid4()),
                        "status": DeliveryStatus.FAILED,
                        "sent_at": datetime.now(timezone.utc),
                        "error_message": err_msg,
                        "gateway": "SMSLENZ",
                        "pages": 1,
                        "recipient_number": normalized_phone,
                        "sms_credit_balance": None,
                        "raw_response": resp_json,
                    }

        except httpx.TimeoutException as ex:
            exec_time = round(time.time() - start_time, 3)
            logger.bind(
                request_id=request_id,
                campaign_id=campaign_id,
                recipient_count=1,
                gateway="SMSLENZ",
                execution_time=exec_time,
                errors=str(ex),
            ).error(f"[SMSLENZ] Gateway Timeout | phone={normalized_phone}")
            return {
                "message_id": str(uuid.uuid4()),
                "status": DeliveryStatus.FAILED,
                "sent_at": datetime.now(timezone.utc),
                "error_message": "SMSlenz Gateway Timeout",
                "gateway": "SMSLENZ",
                "pages": 1,
                "recipient_number": normalized_phone,
                "sms_credit_balance": None,
                "raw_response": None,
            }

        except (httpx.NetworkError, httpx.RequestError) as ex:
            exec_time = round(time.time() - start_time, 3)
            logger.bind(
                request_id=request_id,
                campaign_id=campaign_id,
                recipient_count=1,
                gateway="SMSLENZ",
                execution_time=exec_time,
                errors=str(ex),
            ).error(f"[SMSLENZ] Network Error | phone={normalized_phone}")
            return {
                "message_id": str(uuid.uuid4()),
                "status": DeliveryStatus.FAILED,
                "sent_at": datetime.now(timezone.utc),
                "error_message": "SMSlenz Network Communication Error",
                "gateway": "SMSLENZ",
                "pages": 1,
                "recipient_number": normalized_phone,
                "sms_credit_balance": None,
                "raw_response": None,
            }

        except httpx.HTTPStatusError as ex:
            exec_time = round(time.time() - start_time, 3)
            logger.bind(
                request_id=request_id,
                campaign_id=campaign_id,
                recipient_count=1,
                gateway="SMSLENZ",
                execution_time=exec_time,
                errors=str(ex),
            ).error(f"[SMSLENZ] HTTP Error {ex.response.status_code} | phone={normalized_phone}")
            return {
                "message_id": str(uuid.uuid4()),
                "status": DeliveryStatus.FAILED,
                "sent_at": datetime.now(timezone.utc),
                "error_message": f"SMSlenz HTTP {ex.response.status_code} Error",
                "gateway": "SMSLENZ",
                "pages": 1,
                "recipient_number": normalized_phone,
                "sms_credit_balance": None,
                "raw_response": None,
            }

        except Exception as ex:
            exec_time = round(time.time() - start_time, 3)
            logger.bind(
                request_id=request_id,
                campaign_id=campaign_id,
                recipient_count=1,
                gateway="SMSLENZ",
                execution_time=exec_time,
                errors=str(ex),
            ).exception(f"[SMSLENZ] Unexpected Error | phone={normalized_phone}")
            return {
                "message_id": str(uuid.uuid4()),
                "status": DeliveryStatus.FAILED,
                "sent_at": datetime.now(timezone.utc),
                "error_message": f"SMSlenz Dispatch Error: {str(ex)}",
                "gateway": "SMSLENZ",
                "pages": 1,
                "recipient_number": normalized_phone,
                "sms_credit_balance": None,
                "raw_response": None,
            }

    async def send_bulk_sms(
        self,
        recipients: Union[List[str], List[Dict[str, str]]],
        message: str,
        sender_id: Optional[str] = None,
        campaign_id: Optional[str] = None,
        batch_size: int = 100,
        progress_callback: Optional[Callable[[int, int, int, int], None]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Send bulk SMS via SMSlenz POST /send-bulk-sms endpoint.

        Supports thousands of recipients by chunking contacts into batches.
        Asynchronously yields to FastAPI event loop during batch iteration.
        """
        request_id = str(uuid.uuid4())
        start_time = time.time()
        user_id, api_key, resolved_sender = self._get_credentials(sender_id)

        # 1. Extract and validate phone numbers
        valid_contacts: List[str] = []
        invalid_results: List[Dict[str, Any]] = []

        for item in recipients:
            raw_phone = item if isinstance(item, str) else item.get("phone", "")
            is_valid, norm_phone = self.validate_phone_number(raw_phone)
            if is_valid:
                valid_contacts.append(norm_phone)
            else:
                invalid_results.append({
                    "phone": raw_phone,
                    "message_id": str(uuid.uuid4()),
                    "status": DeliveryStatus.FAILED,
                    "sent_at": datetime.now(timezone.utc),
                    "error_message": f"Invalid Sri Lankan mobile number format: '{raw_phone}'. Must be +947XXXXXXXX.",
                    "gateway": "SMSLENZ",
                    "pages": 1,
                    "sms_credit_balance": None,
                })

        total_recipients = len(recipients)
        total_valid = len(valid_contacts)

        logger.bind(
            request_id=request_id,
            campaign_id=campaign_id,
            recipient_count=total_recipients,
            gateway="SMSLENZ",
            execution_time=0.0,
            errors=None,
        ).info(f"[SMSLENZ] Bulk SMS Initialization | total={total_recipients} | valid={total_valid} | invalid={len(invalid_results)}")

        all_results: List[Dict[str, Any]] = list(invalid_results)

        if not valid_contacts:
            return all_results

        # 2. Chunk valid contacts into batches
        batches = [valid_contacts[i : i + batch_size] for i in range(0, total_valid, batch_size)]
        total_batches = len(batches)
        processed_count = len(invalid_results)

        endpoint = f"{self.base_url}/send-bulk-sms"

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            for b_idx, batch in enumerate(batches, start=1):
                batch_start = time.time()
                payload = {
                    "user_id": user_id,
                    "api_key": api_key,
                    "sender_id": resolved_sender,
                    "contacts": batch,
                    "message": message,
                }

                try:
                    response = await client.post(endpoint, json=payload)
                    batch_exec_time = round(time.time() - batch_start, 3)

                    if response.status_code in (401, 403):
                        for phone in batch:
                            all_results.append({
                                "phone": phone,
                                "message_id": str(uuid.uuid4()),
                                "status": DeliveryStatus.FAILED,
                                "sent_at": datetime.now(timezone.utc),
                                "error_message": "Invalid SMSlenz API Credentials",
                                "gateway": "SMSLENZ",
                                "pages": 1,
                                "sms_credit_balance": None,
                            })
                    else:
                        response.raise_for_status()
                        resp_json = response.json()
                        success = resp_json.get("success", False)
                        res_data = resp_json.get("data") or {}
                        res_status = str(res_data.get("status", "")).lower()

                        if success or res_status == "success":
                            credit_bal_str = res_data.get("sms_credit_balance")
                            credit_bal = float(credit_bal_str) if credit_bal_str is not None else None
                            msg_id = str(res_data.get("campaign_id") or uuid.uuid4())
                            pages = int(res_data.get("pages", 1))

                            for phone in batch:
                                all_results.append({
                                    "phone": phone,
                                    "message_id": msg_id,
                                    "status": DeliveryStatus.ACCEPTED,
                                    "sent_at": datetime.now(timezone.utc),
                                    "error_message": None,
                                    "gateway": "SMSLENZ",
                                    "pages": pages,
                                    "sms_credit_balance": credit_bal,
                                    "raw_response": resp_json,
                                })
                        else:
                            err_msg = resp_json.get("message") or res_data.get("message") or "Bulk SMS dispatch failed"
                            for phone in batch:
                                all_results.append({
                                    "phone": phone,
                                    "message_id": str(uuid.uuid4()),
                                    "status": DeliveryStatus.FAILED,
                                    "sent_at": datetime.now(timezone.utc),
                                    "error_message": err_msg,
                                    "gateway": "SMSLENZ",
                                    "pages": 1,
                                    "sms_credit_balance": None,
                                    "raw_response": resp_json,
                                })

                except httpx.TimeoutException as ex:
                    batch_exec_time = round(time.time() - batch_start, 3)
                    logger.warning(f"[SMSLENZ] Bulk Batch Timeout | batch={b_idx}/{total_batches} | size={len(batch)}")
                    for phone in batch:
                        all_results.append({
                            "phone": phone,
                            "message_id": str(uuid.uuid4()),
                            "status": DeliveryStatus.FAILED,
                            "sent_at": datetime.now(timezone.utc),
                            "error_message": "SMSlenz Gateway Timeout during bulk dispatch",
                            "gateway": "SMSLENZ",
                            "pages": 1,
                            "sms_credit_balance": None,
                        })

                except Exception as ex:
                    batch_exec_time = round(time.time() - batch_start, 3)
                    logger.error(f"[SMSLENZ] Bulk Batch Error | batch={b_idx}/{total_batches} | error={str(ex)}")
                    for phone in batch:
                        all_results.append({
                            "phone": phone,
                            "message_id": str(uuid.uuid4()),
                            "status": DeliveryStatus.FAILED,
                            "sent_at": datetime.now(timezone.utc),
                            "error_message": f"Bulk Send Error: {str(ex)}",
                            "gateway": "SMSLENZ",
                            "pages": 1,
                            "sms_credit_balance": None,
                        })

                processed_count += len(batch)

                # Invoke progress callback if provided
                if progress_callback:
                    try:
                        progress_callback(b_idx, total_batches, processed_count, total_recipients)
                    except Exception as p_ex:
                        logger.warning(f"[SMSLENZ] Progress callback failed: {p_ex}")

                # Non-blocking yield to event loop
                await asyncio.sleep(0.01)

        total_exec_time = round(time.time() - start_time, 3)
        delivered_count = sum(1 for r in all_results if r.get("status") in (DeliveryStatus.ACCEPTED, DeliveryStatus.DELIVERED))
        failed_count = total_recipients - delivered_count

        logger.bind(
            request_id=request_id,
            campaign_id=campaign_id,
            recipient_count=total_recipients,
            gateway="SMSLENZ",
            execution_time=total_exec_time,
            errors=f"{failed_count} failed" if failed_count > 0 else None,
        ).info(f"[SMSLENZ] Bulk SMS Execution Completed | total={total_recipients} | delivered={delivered_count} | failed={failed_count} | time={total_exec_time}s")

        return all_results

    async def account_status(self) -> Dict[str, Any]:
        """
        Fetch account status and SMS credit balance via POST /account-status.
        """
        request_id = str(uuid.uuid4())
        start_time = time.time()
        user_id, api_key, _ = self._get_credentials()

        payload = {
            "user_id": user_id,
            "api_key": api_key,
        }

        endpoint = f"{self.base_url}/account-status"

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(endpoint, json=payload)
                exec_time = round(time.time() - start_time, 3)

                if response.status_code in (401, 403):
                    logger.bind(
                        request_id=request_id,
                        campaign_id=None,
                        recipient_count=0,
                        gateway="SMSLENZ",
                        execution_time=exec_time,
                        errors=response.text,
                    ).error("[SMSLENZ] Invalid Credentials on Account Status API.")
                    raise SMSLenzAuthException("Invalid SMSlenz API Credentials")

                response.raise_for_status()
                resp_json = response.json()

                data = resp_json.get("data") or {}
                raw_balance = data.get("sms_credit_balance", "0")

                try:
                    balance_float = float(raw_balance)
                except (ValueError, TypeError):
                    balance_float = 0.0

                logger.bind(
                    request_id=request_id,
                    campaign_id=None,
                    recipient_count=0,
                    gateway="SMSLENZ",
                    execution_time=exec_time,
                    errors=None,
                ).info(f"[SMSLENZ] Account Status Fetched | balance={balance_float} | status={data.get('account_status')} | exec_time={exec_time}s")

                return {
                    "account_status": data.get("account_status", "active"),
                    "sms_credit_balance": balance_float,
                    "allocated_balances": data.get("allocated_balances", []),
                    "sender_ids": data.get("sender_ids", []),
                    "raw_response": resp_json,
                }

        except httpx.TimeoutException as ex:
            logger.error("[SMSLENZ] Account Status Request Timed Out")
            raise SMSLenzTimeoutException("Account status query timed out") from ex
        except (httpx.NetworkError, httpx.RequestError) as ex:
            logger.error(f"[SMSLENZ] Account Status Network Error: {ex}")
            raise SMSLenzNetworkException("Network error while querying account status") from ex
        except httpx.HTTPStatusError as ex:
            logger.error(f"[SMSLENZ] Account Status HTTP Error {ex.response.status_code}")
            raise SMSLenzHTTPException(ex.response.status_code, "HTTP error fetching account status") from ex

    async def check_balance(self) -> float:
        """
        Retrieve remaining SMS credit balance by invoking account_status API.
        """
        status_res = await self.account_status()
        return status_res.get("sms_credit_balance", 0.0)

    async def check_status(self, message_id: str) -> DeliveryStatus:
        """
        Query gateway delivery status for a specific message_id.
        Note: SMSlenz API does not provide a DLR / message status endpoint.
        Returns ACCEPTED indicating the message was accepted by the gateway queue.
        """
        return DeliveryStatus.ACCEPTED
