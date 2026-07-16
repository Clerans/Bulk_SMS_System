import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.core.security import hash_password
from app.dependencies.auth import get_current_user, require_admin, require_manager
from app.models.user import User, UserRole, UserStatus
from app.repositories.user import user_repository
from app.schemas.user import UserCreate, UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("", response_model=None, dependencies=[Depends(require_manager)])
async def get_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    role: Optional[UserRole] = Query(None),
    status_filter: Optional[UserStatus] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve users list (paginated, sorted, and filtered). Accessible to Admin and Manager.
    """
    items, total = await user_repository.search_users(
        db,
        skip=skip,
        limit=limit,
        search=search,
        role=role,
        status=status_filter
    )
    
    return {
        "success": True,
        "message": "Users retrieved successfully",
        "data": {
            "items": [UserResponse.model_validate(item) for item in items],
            "total": total,
            "skip": skip,
            "limit": limit
        },
        "errors": None
    }

@router.post("", response_model=None, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
async def create_user(
    data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new user. Accessible only to Admin.
    """
    existing_user = await user_repository.get_by_email(db, email=data.email)
    if existing_user:
        raise BadRequestException(message="A user with this email already exists")
        
    user_data = data.model_dump()
    user_data["password"] = hash_password(data.password)
    new_user = await user_repository.create(db, obj_in=user_data)
    
    return {
        "success": True,
        "message": "User created successfully",
        "data": UserResponse.model_validate(new_user),
        "errors": None
    }

@router.put("/{user_id}", response_model=None)
async def update_user(
    user_id: uuid.UUID,
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update details of a user. Admin can update any user; others can only update their own profile.
    """
    # Enforce access permissions
    if current_user.role != UserRole.ADMIN and current_user.id != user_id:
        raise ForbiddenException(message="You do not have permission to update this profile")
        
    db_user = await user_repository.get(db, id=user_id)
    if not db_user:
        raise NotFoundException(message="User not found")
        
    update_data = data.model_dump(exclude_unset=True)
    if "password" in update_data and update_data["password"]:
        update_data["password"] = hash_password(update_data["password"])
        
    if "email" in update_data:
        existing_email = await user_repository.get_by_email(db, email=update_data["email"])
        if existing_email and existing_email.id != user_id:
            raise BadRequestException(message="A user with this email already exists")

    # Only Admin can update roles or status
    if current_user.role != UserRole.ADMIN:
        update_data.pop("role", None)
        update_data.pop("status", None)

    updated_user = await user_repository.update(db, db_obj=db_user, obj_in=update_data)
    
    return {
        "success": True,
        "message": "User updated successfully",
        "data": UserResponse.model_validate(updated_user),
        "errors": None
    }

@router.delete("/{user_id}", response_model=None, dependencies=[Depends(require_admin)])
async def delete_user(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a user account (soft delete). Accessible only to Admin. User cannot delete themselves.
    """
    if current_user.id == user_id:
        raise BadRequestException(message="You cannot delete your own account")
        
    db_user = await user_repository.get(db, id=user_id)
    if not db_user:
        raise NotFoundException(message="User not found")
        
    await user_repository.remove(db, id=user_id, soft=True)
    
    return {
        "success": True,
        "message": "User deleted successfully",
        "data": None,
        "errors": None
    }
