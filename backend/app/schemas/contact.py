from datetime import datetime
from typing import Any, List, Optional
import uuid
from pydantic import BaseModel, EmailStr, Field, computed_field

from app.models.contact import ContactStatus

class ContactBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    phone: str = Field(..., min_length=7, max_length=20)
    email: Optional[EmailStr] = None
    company: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None
    country: Optional[str] = Field("LK", max_length=50)
    status: ContactStatus = ContactStatus.ACTIVE

class ContactCreate(ContactBase):
    group_name: Optional[str] = None  # Optional group to assign on creation

class ContactUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=50)
    last_name: Optional[str] = Field(None, min_length=1, max_length=50)
    phone: Optional[str] = Field(None, min_length=7, max_length=20)
    email: Optional[EmailStr] = None
    company: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None
    country: Optional[str] = Field(None, max_length=50)
    status: Optional[ContactStatus] = None
    group_name: Optional[str] = None

class ContactResponse(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str
    phone: str
    email: Optional[EmailStr] = None
    company: Optional[str] = None
    notes: Optional[str] = None
    country: str
    status: ContactStatus
    last_campaign: Optional[str] = Field(None, serialization_alias="lastCampaign")
    created_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True

    @computed_field
    @property
    def name(self) -> str:
        """
        Merges first name and last name into a single display name.
        """
        return f"{self.first_name} {self.last_name}".strip()

    @computed_field
    @property
    def group(self) -> str:
        """
        Returns the primary group name if associated.
        """
        # If model is loaded with groups relationship
        if hasattr(self, "groups") and self.groups:
            return self.groups[0].name
        return ""
