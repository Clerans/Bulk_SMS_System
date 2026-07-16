import enum
import uuid
from sqlalchemy import Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import SoftDeleteMixin, TimestampMixin

class TemplateCategory(str, enum.Enum):
    Marketing = "Marketing"
    Transactional = "Transactional"
    Reminder = "Reminder"
    Notification = "Notification"
    OTP = "OTP"

class SMSTemplate(Base, TimestampMixin, SoftDeleteMixin):
    """
    Template model holding pre-written SMS texts with merge placeholders.
    """
    __tablename__ = "templates"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[TemplateCategory] = mapped_column(
        Enum(TemplateCategory, name="template_category_enum"),
        default=TemplateCategory.Marketing,
        nullable=False
    )
    message: Mapped[str] = mapped_column(Text, nullable=False)
    
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
