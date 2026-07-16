import uuid
import jwt
from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import decode_token
from app.models.user import User, UserStatus
from app.repositories.user import user_repository

async def get_websocket_user(token: str) -> User | None:
    """
    Validates a JWT token passed from a WebSocket client and resolves the associated active User.
    """
    try:
        payload = decode_token(token, settings.JWT_SECRET_KEY)
        user_id = payload.get("sub")
        token_type = payload.get("type")
        
        if token_type != "access" or not user_id:
            return None
            
        user_uuid = uuid.UUID(user_id)
        async with SessionLocal() as db:
            user = await user_repository.get(db, id=user_uuid)
            if user and user.status == UserStatus.ACTIVE:
                return user
    except Exception:
        pass
    return None
