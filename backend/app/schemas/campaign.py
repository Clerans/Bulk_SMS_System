from datetime import datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field

from app.models.campaign import CampaignStatus, DeliveryStatus
from app.models.campaign_batch import BatchStatus

class CampaignBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    sender_id: str = Field("UMG Lanka", min_length=2, max_length=50, validation_alias="senderId", serialization_alias="senderId")
    message: str = Field(..., min_length=1)
    route: str = Field("Default Route", min_length=2, max_length=50)

class RecipientManual(BaseModel):
    name: Optional[str] = "Recipient"
    phone: str

class CampaignCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    sender_id: str = Field("UMG Lanka", validation_alias="senderId")
    message: str = Field(..., min_length=1)
    recipient_source: str = Field("GROUPS", validation_alias="recipientSource")
    route_id: str = Field("Default Route", validation_alias="routeId")
    schedule_type: str = Field("NOW", validation_alias="scheduleType")
    scheduled_at: Optional[datetime] = Field(None, validation_alias="scheduledAt")
    
    # Payload variants
    group_ids: Optional[List[uuid.UUID]] = Field(None, validation_alias="groupIds")
    recipients: Optional[List[RecipientManual]] = None
    template_id: Optional[uuid.UUID] = Field(None, validation_alias="templateId")

class CampaignUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    status: Optional[CampaignStatus] = None

class CampaignBatchResponse(BaseModel):
    id: uuid.UUID
    batch_number: int = Field(..., serialization_alias="batchNumber")
    transaction_id: int = Field(..., serialization_alias="transactionId")
    gateway_campaign_id: Optional[str] = Field(None, serialization_alias="gatewayCampaignId")
    recipient_count: int = Field(..., serialization_alias="recipientCount")
    accepted_count: int = Field(0, serialization_alias="acceptedCount")
    submitted_count: int = Field(0, serialization_alias="submittedCount")
    delivered_count: int = Field(0, serialization_alias="deliveredCount")
    failed_count: int = Field(0, serialization_alias="failedCount")
    status: BatchStatus
    cost: float = 0.0
    error_code: Optional[str] = Field(None, serialization_alias="errorCode")
    error_message: Optional[str] = Field(None, serialization_alias="errorMessage")
    started_at: Optional[datetime] = Field(None, serialization_alias="startedAt")
    completed_at: Optional[datetime] = Field(None, serialization_alias="completedAt")
    created_at: Optional[datetime] = Field(None, serialization_alias="createdAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class CampaignRecipientResponse(BaseModel):
    id: uuid.UUID
    contact_id: uuid.UUID
    batch_id: Optional[uuid.UUID] = Field(None, serialization_alias="batchId")
    status: DeliveryStatus
    error_message: Optional[str] = None
    sms_units: int
    gateway_message_id: Optional[str] = Field(None, serialization_alias="gatewayMessageId")
    gateway_response: Optional[str] = Field(None, serialization_alias="gatewayResponse")
    error_code: Optional[str] = Field(None, serialization_alias="errorCode")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class CampaignResponse(BaseModel):
    id: uuid.UUID
    name: str
    sender_id: str = Field(..., serialization_alias="senderId")
    message: str
    status: CampaignStatus
    
    recipient_count: int = Field(..., serialization_alias="recipientCount")
    delivered_count: int = Field(..., serialization_alias="deliveredCount")
    failed_count: int = Field(..., serialization_alias="failedCount")
    pending_count: int = Field(..., serialization_alias="pendingCount")
    submitted_count: int = Field(0, serialization_alias="submittedCount")
    sms_units: int = Field(..., serialization_alias="smsUnits")
    route: str
    
    template: Optional[str] = None
    created_by: Optional[str] = Field(None, serialization_alias="createdBy")
    gateway: Optional[str] = "Dialog eSMS"
    queue_id: Optional[str] = Field(None, serialization_alias="queueId")
    transaction_id: Optional[int] = Field(None, serialization_alias="transactionId")
    gateway_campaign_id: Optional[str] = Field(None, serialization_alias="gatewayCampaignId")
    cost: float = 0.0
    wallet_balance: Optional[float] = Field(None, serialization_alias="walletBalance")
    message_ids: List[str] = Field(default_factory=list, serialization_alias="messageIds")
    retry_count: int = Field(0, serialization_alias="retryCount")
    batches: List[CampaignBatchResponse] = Field(default_factory=list)
    progress: Optional[dict] = None
    status_breakdown: Optional[dict] = Field(None, serialization_alias="statusBreakdown")

    scheduled_at: Optional[datetime] = Field(None, serialization_alias="scheduledAt")
    sent_at: Optional[datetime] = Field(None, serialization_alias="sentAt")
    created_at: datetime = Field(..., serialization_alias="createdAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
