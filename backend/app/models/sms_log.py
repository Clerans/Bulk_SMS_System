import uuid
from datetime import datetime
from sqlalchemy import Enum, ForeignKey, String, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base
from app.models.campaign import DeliveryStatus

class SMSLog(Base):
    """
    SMSLogs representation storing granular logs for each sent message.
    """
    __tablename__ = "sms_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    campaign_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("campaigns.id", ondelete="SET NULL"),
        nullable=True
    )
    recipient_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("campaign_recipients.id", ondelete="SET NULL"),
        nullable=True
    )
    
    phone: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    provider: Mapped[str] = mapped_column(String(50), nullable=False, default="MOCK")
    status: Mapped[DeliveryStatus] = mapped_column(
        Enum(DeliveryStatus, name="log_delivery_status_enum"),
        default=DeliveryStatus.PENDING,
        nullable=False
    )
    
    error_message: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    # Relationships
    campaign = relationship("Campaign")
    recipient = relationship("CampaignRecipient")
