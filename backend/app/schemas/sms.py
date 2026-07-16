from typing import List, Optional
from pydantic import BaseModel, Field

class SendSMSRequest(BaseModel):
    phone: str = Field(..., min_length=7, max_length=20)
    message: str = Field(..., min_length=1)
    sender_id: Optional[str] = Field(None, validation_alias="senderId")

class SendBulkSMSRequest(BaseModel):
    phones: List[str] = Field(..., min_items=1)
    message: str = Field(..., min_length=1)
    sender_id: Optional[str] = Field(None, validation_alias="senderId")
