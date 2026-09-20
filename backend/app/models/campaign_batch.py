import enum
import uuid
from datetime import datetime
from sqlalchemy import BigInteger, Enum, Float, ForeignKey, Integer, String, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base
from app.models.base import TimestampMixin
from app.models.campaign import CampaignStatus

class BatchStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    ACCEPTED = "ACCEPTED"
    SUBMITTED = "SUBMITTED"
    DELIVERING = "DELIVERING"
    COMPLETED = "COMPLETED"
    PARTIALLY_FAILED = "PARTIALLY_FAILED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class CampaignBatch(Base, TimestampMixin):
    """
    CampaignBatch model representing an individual submission batch (up to 1,000 recipients)
    within a parent Campaign. Every batch has a distinct Dialog transaction_id and gateway_campaign_id.
    """
    __tablename__ = "campaign_batches"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("campaigns.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    batch_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    
    # Dialog eSMS attributes for this specific batch
    transaction_id: Mapped[int] = mapped_column(
        BigInteger,
        unique=True,
        nullable=False,
        index=True
    )
    gateway_campaign_id: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        index=True
    )
    
    # Batch statistics
    recipient_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    accepted_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    submitted_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    delivered_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failed_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    status: Mapped[BatchStatus] = mapped_column(
        Enum(BatchStatus, name="batch_status_enum", values_callable=lambda x: [e.value for e in x]),
        default=BatchStatus.PENDING,
        nullable=False
    )
    
    cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    gateway_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    campaign = relationship("Campaign", back_populates="batches")
    recipients = relationship("CampaignRecipient", back_populates="batch")
    delivery_events = relationship("DeliveryEvent", back_populates="batch")
