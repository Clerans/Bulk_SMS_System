from datetime import datetime
from typing import Optional
import uuid
from pydantic import BaseModel, Field, computed_field

from app.models.campaign import DeliveryStatus

class DeliveryReportResponse(BaseModel):
    id: uuid.UUID
    phone: str
    status: DeliveryStatus
    sent_at: datetime = Field(..., serialization_alias="sentAt")
    delivered_at: Optional[datetime] = Field(None, serialization_alias="deliveredAt")
    
    # Map database error_message to serialization field
    error_message: Optional[str] = Field(None, exclude=True)

    class Config:
        from_attributes = True
        populate_by_name = True

    @computed_field
    @property
    def campaignName(self) -> str:
        """
        Dynamically extracts the campaign name associated with the log.
        """
        if hasattr(self, "campaign") and self.campaign:
            return self.campaign.name
        return "Ad-hoc SMS"

    @computed_field
    @property
    def failureReason(self) -> Optional[str]:
        """
        Serializes error_message as failureReason.
        """
        return self.error_message
