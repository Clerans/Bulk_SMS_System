import uuid
from datetime import datetime
from sqlalchemy import BigInteger, ForeignKey, Integer, String, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base
from app.models.base import TimestampMixin

class GatewayTransaction(Base, TimestampMixin):
    """
    Tracks every transaction submitted to the SMS Gateway (e.g. Dialog eSMS, SMSlenz).
    Enforces transaction ID auditability and prevents duplicate submissions.
    """
    __tablename__ = "gateway_transactions"

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
    transaction_id: Mapped[int | None] = mapped_column(
        BigInteger,
        unique=True,
        index=True,
        nullable=True
    )
    gateway: Mapped[str] = mapped_column(String(50), default="ESMS", nullable=False)
    gateway_campaign_id: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    
    request_payload: Mapped[str | None] = mapped_column(Text, nullable=True)
    response_payload: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    status: Mapped[str] = mapped_column(String(50), default="PENDING", nullable=False)
    error_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    campaign = relationship("Campaign")
