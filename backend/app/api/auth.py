from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import BadRequestException
from app.core.security import hash_password
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.repositories.user import user_repository
from app.schemas.user import LoginRequest, UserCreate, UserResponse
from app.services.auth_service import auth_service

router = APIRouter(prefix="/auth", tags=["Authentication"])

class RefreshTokenRequest(BaseModel):
    refresh_token: str

@router.post("/login", status_code=status.HTTP_200_OK)
async def login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticate user credentials, returning access & refresh tokens.
    """
    user = await auth_service.authenticate(db, email=data.email, password=data.password)
    access_token, refresh_token = auth_service.generate_tokens(user_id=user.id)
    
    return {
        "success": True,
        "message": "Login successful",
        "data": {
            "token": access_token,
            "refresh_token": refresh_token,
            "user": UserResponse.model_validate(user)
        },
        "errors": None
    }

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new user in the system.
    """
    existing_user = await user_repository.get_by_email(db, email=data.email)
    if existing_user:
        raise BadRequestException(message="A user with this email already exists")

    # Hash the password and create the user
    user_data = data.model_dump()
    user_data["password"] = hash_password(data.password)
    new_user = await user_repository.create(db, obj_in=user_data)
    
    return {
        "success": True,
        "message": "User registered successfully",
        "data": UserResponse.model_validate(new_user),
        "errors": None
    }

@router.post("/refresh", status_code=status.HTTP_200_OK)
async def refresh_tokens(
    data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Submit a refresh token to obtain a fresh pair of access and refresh tokens.
    """
    new_access, new_refresh = await auth_service.refresh_tokens(db, refresh_token=data.refresh_token)
    return {
        "success": True,
        "message": "Tokens refreshed successfully",
        "data": {
            "token": new_access,
            "refresh_token": new_refresh
        },
        "errors": None
    }

@router.get("/me", status_code=status.HTTP_200_OK)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Retrieve details of the currently authenticated user.
    """
    return {
        "success": True,
        "message": "Current user retrieved successfully",
        "data": UserResponse.model_validate(current_user),
        "errors": None
    }
