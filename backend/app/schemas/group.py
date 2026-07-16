from datetime import datetime
from typing import Optional
import uuid
from pydantic import BaseModel, Field

class GroupBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=255)

class GroupCreate(GroupBase):
    pass

class GroupUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=255)

class GroupResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    contact_count: int = Field(0, serialization_alias="contactCount")
    created_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True
