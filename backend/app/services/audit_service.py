from typing import Any, Dict, Optional
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.models.audit_log import AuditLog

class AuditService:
    """
    Audit logging service tracking administrative and security-sensitive events.
    """
    async def log_action(
        self,
        db: AsyncSession,
        *,
        user_id: Optional[uuid.UUID],
        action: str,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None
    ) -> AuditLog:
        """
        Write a new action tracking record to the database and log to standard output.
        """
        try:
            log_entry = AuditLog(
                user_id=user_id,
                action=action,
                details=details,
                ip_address=ip_address
            )
            db.add(log_entry)
            await db.commit()
            
            logger.info(
                f"[AUDIT] User: {user_id or 'System'} | Action: {action} | Details: {details or '{}'}"
            )
            return log_entry
        except Exception as e:
            logger.error(f"Failed to record audit log: {str(e)}")
            # We don't want to crash the main request due to an audit logging failure, so swallow
            return None

audit_service = AuditService()
