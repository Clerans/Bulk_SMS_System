from datetime import datetime
from typing import Optional
from sqlalchemy import Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

class TimestampMixin:
    """
    SQLAlchemy Mixin to automatically include created_at and updated_at datetime stamps.
    """
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

class SoftDeleteMixin:
    """
    SQLAlchemy Mixin to support soft-deleting database records.
    """
    is_deleted: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None
    )

    def soft_delete(self) -> None:
        self.is_deleted = True
        self.deleted_at = func.now()

    def restore(self) -> None:
        self.is_deleted = False
        self.deleted_at = None
