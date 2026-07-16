import uuid
from typing import List
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
import jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.core.security import decode_token
from app.models.user import User, UserRole, UserStatus
from app.repositories.user import user_repository

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)

async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(reusable_oauth2)
) -> User:
    """
    FastAPI dependency that extracts the JWT from the request header,
    verifies it, and retrieves the associated active User object.
    """
    try:
        payload = decode_token(token, settings.JWT_SECRET_KEY)
        user_id = payload.get("sub")
        token_type = payload.get("type")
        
        if token_type != "access" or not user_id:
            raise UnauthorizedException(message="Could not validate credentials")
    except jwt.PyJWTError:
        raise UnauthorizedException(message="Could not validate credentials")

    try:
        user_uuid = uuid.UUID(user_id)
    except (ValueError, AttributeError):
        raise UnauthorizedException(message="Could not validate credentials")

    user = await user_repository.get(db, id=user_uuid)
    if not user:
        raise UnauthorizedException(message="User not found")
        
    if user.status != UserStatus.ACTIVE:
        raise UnauthorizedException(message="User account is deactivated")
        
    return user

class RoleChecker:
    """
    Dependency helper to enforce role-based access control on endpoints.
    """
    def __init__(self, allowed_roles: List[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in self.allowed_roles:
            raise ForbiddenException(
                message="You do not have permission to access this resource"
            )
        return current_user

# Predefined role dependencies for clean code
require_admin = RoleChecker([UserRole.ADMIN])
require_manager = RoleChecker([UserRole.ADMIN, UserRole.MANAGER])
require_operator = RoleChecker([UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR])
require_viewer = RoleChecker([UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.VIEWER])
