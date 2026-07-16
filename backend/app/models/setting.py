import uuid
from sqlalchemy import Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin

class Setting(Base, TimestampMixin):
    """
    Application wide settings, SMS gateway details, and balance information.
    Single row database configuration table.
    """
    __tablename__ = "settings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    
    # User DB Tables layout requirements
    sender_id: Mapped[str] = mapped_column(String(50), nullable=False, default="CAFECHAI")
    gateway: Mapped[str] = mapped_column(String(50), nullable=False, default="MOCK")
    api_key: Mapped[str | None] = mapped_column(String(255), nullable=True)
    api_secret: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sms_balance: Mapped[int] = mapped_column(Integer, nullable=False, default=50000)

    # Frontend requirements
    company_name: Mapped[str] = mapped_column(String(100), nullable=False, default="CafeChai Sri Lanka")
    default_country: Mapped[str] = mapped_column(String(50), nullable=False, default="Sri Lanka")
    default_country_code: Mapped[str] = mapped_column(String(10), nullable=False, default="+94")
    timezone: Mapped[str] = mapped_column(String(50), nullable=False, default="Asia/Colombo")
    default_sender_id: Mapped[str] = mapped_column(String(50), nullable=False, default="CAFECHAI")
    default_route: Mapped[str] = mapped_column(String(50), nullable=False, default="Premium Route")
    sms_balance_warning_threshold: Mapped[int] = mapped_column(Integer, nullable=False, default=5000)
