from typing import Any, Tuple, Union
from sqlalchemy.ext.asyncio import AsyncSession
import jwt
import uuid

from app.core.config import settings
from app.core.exceptions import UnauthorizedException
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from app.models.user import User, UserStatus
from app.repositories.user import user_repository

class AuthService:
    """
    Service encapsulating authentication, password validation, and token exchanges.
    """
    async def authenticate(
        self, db: AsyncSession, email: str, password: str
    ) -> User:
        """
        Authenticate a user by email and password. Raises UnauthorizedException if invalid.
        """
        user = await user_repository.get_by_email(db, email=email)
        if not user:
            raise UnauthorizedException(message="Incorrect email or password")
            
        if not verify_password(password, user.password):
            raise UnauthorizedException(message="Incorrect email or password")
            
        if user.status != UserStatus.ACTIVE:
            raise UnauthorizedException(message="User account is deactivated")
            
        return user

    def generate_tokens(self, user_id: Any) -> Tuple[str, str]:
        """
        Generate both access and refresh tokens for a user ID.
        """
        access_token = create_access_token(subject=user_id)
        refresh_token = create_refresh_token(subject=user_id)
        return access_token, refresh_token

    async def refresh_tokens(self, db: AsyncSession, refresh_token: str) -> Tuple[str, str]:
        """
        Exchange a valid refresh token for a new set of access/refresh tokens.
        """
        try:
            payload = decode_token(refresh_token, settings.JWT_REFRESH_SECRET_KEY)
            token_type = payload.get("type")
            user_id = payload.get("sub")
            
            if token_type != "refresh" or not user_id:
                raise UnauthorizedException(message="Invalid refresh token")
        except jwt.PyJWTError:
            raise UnauthorizedException(message="Invalid or expired refresh token")

        try:
            user_uuid = uuid.UUID(user_id)
        except (ValueError, AttributeError):
            raise UnauthorizedException(message="Invalid refresh token")

        user = await user_repository.get(db, id=user_uuid)
        if not user or user.status != UserStatus.ACTIVE:
            raise UnauthorizedException(message="User not found or account deactivated")

        # Generate a new pair of tokens
        new_access_token = create_access_token(subject=user.id)
        new_refresh_token = create_refresh_token(subject=user.id)
        return new_access_token, new_refresh_token

auth_service = AuthService()
