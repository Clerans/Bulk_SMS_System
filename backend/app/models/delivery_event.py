import uuid
from datetime import datetime
from sqlalchemy import ForeignKey, Integer, String, Text, DateTime, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base

class DeliveryEvent(Base):
    """
    Delivery event log for recording raw webhook callbacks from SMS Gateways (Dialog eSMS).
    Ensures idempotent delivery report processing and auditability.
    """
    __tablename__ = "delivery_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    campaign_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("campaigns.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    campaign_recipient_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("campaign_recipients.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    gateway_campaign_id: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    mobile_number: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    gateway_status: Mapped[int] = mapped_column(Integer, nullable=False)
    event_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    raw_payload: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    # Relationships
    campaign = relationship("Campaign")
    recipient = relationship("CampaignRecipient")
