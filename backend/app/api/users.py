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
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new user. Accessible to Super Admin and Admin.
    Admin can create Admin, Operator, Viewer users, but cannot create Superadmin users.
    """
    if current_user.role == UserRole.ADMIN and data.role == UserRole.SUPERADMIN:
        raise ForbiddenException(message="Admins cannot create Super Admin users. Only Super Admin can do this.")

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
    Update details of a user. Super Admin can update anyone; Admin can update non-superadmin users; others can only update their own profile.
    """
    is_superadmin = current_user.role == UserRole.SUPERADMIN
    is_admin = current_user.role == UserRole.ADMIN

    if not is_superadmin and not is_admin and current_user.id != user_id:
        raise ForbiddenException(message="You do not have permission to update this profile")
        
    db_user = await user_repository.get(db, id=user_id)
    if not db_user:
        raise NotFoundException(message="User not found")

    # Admin cannot edit Super Admin
    if is_admin and not is_superadmin and db_user.role == UserRole.SUPERADMIN:
        raise ForbiddenException(message="Admins cannot modify Super Admin profiles")
        
    update_data = data.model_dump(exclude_unset=True)
    if "password" in update_data and update_data["password"]:
        if not is_superadmin:
            raise ForbiddenException(message="Only Super Admin has permission to change user passwords")
        update_data["password"] = hash_password(update_data["password"])
        
    if "email" in update_data and update_data["email"]:
        existing_email = await user_repository.get_by_email(db, email=update_data["email"])
        if existing_email and existing_email.id != user_id:
            raise BadRequestException(message="A user with this email already exists")

    # Role updates: only Super Admin can assign SUPERADMIN role
    if "role" in update_data:
        if not is_superadmin and not is_admin:
            update_data.pop("role", None)
        elif is_admin and update_data["role"] == UserRole.SUPERADMIN:
            raise ForbiddenException(message="Admins cannot assign the Super Admin role")

    if "status" in update_data and not (is_superadmin or is_admin):
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
    Delete a user account (soft delete).
    Rules:
    - User cannot delete their own account.
    - Super Admin cannot be deleted.
    - Admin users can ONLY be deleted by a Super Admin.
    - Operators and Viewers can be deleted by Super Admin or Admin.
    """
    if current_user.id == user_id:
        raise BadRequestException(message="You cannot delete your own account")
        
    db_user = await user_repository.get(db, id=user_id)
    if not db_user:
        raise NotFoundException(message="User not found")

    if db_user.role == UserRole.SUPERADMIN:
        raise ForbiddenException(message="Super Admin accounts cannot be deleted")

    if db_user.role == UserRole.ADMIN and current_user.role != UserRole.SUPERADMIN:
        raise ForbiddenException(message="Only Super Admin has permission to delete an Admin user")
        
    await user_repository.remove(db, id=user_id, soft=True)
    
    return {
        "success": True,
        "message": "User deleted successfully",
        "data": None,
        "errors": None
    }
