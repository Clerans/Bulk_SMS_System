import enum
import uuid
from datetime import datetime
from sqlalchemy import BigInteger, Enum, Float, ForeignKey, Integer, String, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import SoftDeleteMixin, TimestampMixin

class CampaignStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SCHEDULED = "SCHEDULED"
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    ACCEPTED = "ACCEPTED"
    COMPLETED = "COMPLETED"
    PARTIALLY_FAILED = "PARTIALLY_FAILED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class DeliveryStatus(str, enum.Enum):
    PENDING = "PENDING"
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    ACCEPTED = "ACCEPTED"
    SUBMITTED = "SUBMITTED"
    SENT = "SENT"
    DELIVERED = "DELIVERED"
    READ = "READ"
    FAILED = "FAILED"
    EXPIRED = "EXPIRED"
    REJECTED = "REJECTED"

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
    sender_id: Mapped[str] = mapped_column(String(50), nullable=False, default="NotifyDEMO")
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
    
    # Enterprise & Gateway Enhancements
    gateway: Mapped[str | None] = mapped_column(String(50), nullable=True, default="Notify.lk")
    queue_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Dialog eSMS attributes
    transaction_id: Mapped[int | None] = mapped_column(BigInteger, unique=True, nullable=True, index=True)
    gateway_campaign_id: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    payment_method: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    wallet_balance: Mapped[float | None] = mapped_column(Float, nullable=True)
    valid_recipients: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    invalid_recipients: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    duplicate_recipients: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    submitted_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

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

    # Enterprise & Gateway Details
    normalized_mobile_number: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    gateway_status_code: Mapped[str | None] = mapped_column(String(10), nullable=True)
    gateway_campaign_id: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    submission_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    gateway_message_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    gateway_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    failed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    campaign = relationship("Campaign", back_populates="recipients")
    contact = relationship("Contact")
