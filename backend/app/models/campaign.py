import enum
import uuid
from datetime import datetime
from sqlalchemy import Enum, ForeignKey, Integer, String, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import SoftDeleteMixin, TimestampMixin

class CampaignStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SCHEDULED = "SCHEDULED"
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    PARTIALLY_FAILED = "PARTIALLY_FAILED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class DeliveryStatus(str, enum.Enum):
    PENDING = "PENDING"
    QUEUED = "QUEUED"
    SENT = "SENT"
    DELIVERED = "DELIVERED"
    FAILED = "FAILED"

class Campaign(Base, TimestampMixin, SoftDeleteMixin):
    """
    Campaign model representing an SMS campaign sent to a group or segment of contacts.
    """
    __tablename__ = "campaigns"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    template_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("templates.id", ondelete="SET NULL"),
        nullable=True
    )
    sender_id: Mapped[str] = mapped_column(String(50), nullable=False, default="CAFECHAI")
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[CampaignStatus] = mapped_column(
        Enum(CampaignStatus, name="campaign_status_enum"),
        default=CampaignStatus.DRAFT,
        nullable=False
    )
    
    # Delivery Statistics Counters
    recipient_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    delivered_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failed_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    pending_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    sms_units: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    route: Mapped[str] = mapped_column(String(50), nullable=False, default="Default Route")
    
    scheduled_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    template = relationship("SMSTemplate", foreign_keys=[template_id])
    recipients = relationship(
        "CampaignRecipient",
        back_populates="campaign",
        cascade="all, delete-orphan"
    )

class CampaignRecipient(Base):
    """
    CampaignRecipient model linking campaign with target contacts and tracking individual delivery states.
    """
    __tablename__ = "campaign_recipients"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("campaigns.id", ondelete="CASCADE"),
        nullable=False
    )
    contact_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("contacts.id", ondelete="CASCADE"),
        nullable=False
    )
    status: Mapped[DeliveryStatus] = mapped_column(
        Enum(DeliveryStatus, name="delivery_status_enum"),
        default=DeliveryStatus.PENDING,
        nullable=False
    )
    error_message: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sms_units: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Relationships
    campaign = relationship("Campaign", back_populates="recipients")
    contact = relationship("Contact")
