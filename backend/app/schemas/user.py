from datetime import datetime
from typing import Optional
import uuid
from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole, UserStatus

class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    role: UserRole = UserRole.OPERATOR
    status: UserStatus = UserStatus.ACTIVE

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100)

class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None
    password: Optional[str] = Field(None, min_length=6, max_length=100)

class UserResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: EmailStr
    phone: Optional[str] = None
    role: UserRole
    status: UserStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Auth / Token Schemas
class LoginRequest(BaseModel):
    email: str = Field(..., description="Username or Email address")
    password: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class UserLoginResponse(BaseModel):
    token: str
    refresh_token: str
    user: UserResponse

class TokenPayload(BaseModel):
    sub: str
    type: str
    exp: int
