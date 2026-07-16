import enum
import uuid
from sqlalchemy import Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import SoftDeleteMixin, TimestampMixin

class ContactStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    UNSUBSCRIBED = "UNSUBSCRIBED"
    BLACKLISTED = "BLACKLISTED"
    INVALID = "INVALID"

class Contact(Base, TimestampMixin, SoftDeleteMixin):
    """
    Contact model containing subscriber phone number and profile info.
    """
    __tablename__ = "contacts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    first_name: Mapped[str] = mapped_column(String(50), nullable=False)
    last_name: Mapped[str] = mapped_column(String(50), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    company: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    country: Mapped[str | None] = mapped_column(String(50), nullable=True, default="LK")
    status: Mapped[ContactStatus] = mapped_column(
        Enum(ContactStatus, name="contact_status_enum"),
        default=ContactStatus.ACTIVE,
        nullable=False
    )
    last_campaign: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    groups = relationship(
        "Group",
        secondary="group_contacts",
        back_populates="contacts"
    )
