from datetime import datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, Field

from app.models.campaign import CampaignStatus, DeliveryStatus

class CampaignBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    sender_id: str = Field("CAFECHAI", min_length=2, max_length=50, validation_alias="senderId", serialization_alias="senderId")
    message: str = Field(..., min_length=1)
    route: str = Field("Default Route", min_length=2, max_length=50)

class RecipientManual(BaseModel):
    name: str
    phone: str

class CampaignCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    sender_id: str = Field("CAFECHAI", validation_alias="senderId")
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

class CampaignRecipientResponse(BaseModel):
    id: uuid.UUID
    contact_id: uuid.UUID
    status: DeliveryStatus
    error_message: Optional[str] = None
    sms_units: int

    class Config:
        from_attributes = True

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
    sms_units: int = Field(..., serialization_alias="smsUnits")
    route: str
    
    scheduled_at: Optional[datetime] = Field(None, serialization_alias="scheduledAt")
    sent_at: Optional[datetime] = Field(None, serialization_alias="sentAt")
    created_at: datetime = Field(..., serialization_alias="createdAt")

    class Config:
        from_attributes = True
        populate_by_name = True

    # Pydantic v2 allows mapping python timezone aware datetimes natively
