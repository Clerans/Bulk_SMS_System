import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import BadRequestException, NotFoundException
from app.dependencies.auth import require_operator, require_viewer
from app.repositories.group import group_repository
from app.schemas.group import GroupCreate, GroupResponse, GroupUpdate

router = APIRouter(prefix="/groups", tags=["Groups"])

class AssociateContactsRequest(BaseModel):
    contact_ids: List[uuid.UUID]

@router.get("", response_model=None, dependencies=[Depends(require_viewer)])
async def get_groups(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve groups (paginated and filtered) with pre-calculated contact counts.
    """
    items, total = await group_repository.search_groups_with_counts(
        db,
        skip=skip,
        limit=limit,
        search=search
    )
    return {
        "success": True,
        "message": "Groups retrieved successfully",
        "data": {
            "items": [GroupResponse.model_validate(item) for item in items],
            "total": total,
            "skip": skip,
            "limit": limit
        },
        "errors": None
    }

@router.post("", response_model=None, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_operator)])
async def create_group(
    data: GroupCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new contact group. Name must be unique.
    """
    existing = await group_repository.get_by_name(db, name=data.name)
    if existing:
        raise BadRequestException(message="A group with this name already exists")

    new_group = await group_repository.create(db, obj_in=data)
    new_group.contact_count = 0  # Initialize dynamic property
    
    return {
        "success": True,
        "message": "Group created successfully",
        "data": GroupResponse.model_validate(new_group),
        "errors": None
    }

@router.put("/{group_id}", response_model=None, dependencies=[Depends(require_operator)])
async def update_group(
    group_id: uuid.UUID,
    data: GroupUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update a contact group's details.
    """
    db_group = await group_repository.get(db, id=group_id)
    if not db_group:
        raise NotFoundException(message="Group not found")

    if data.name:
        existing = await group_repository.get_by_name(db, name=data.name)
        if existing and existing.id != group_id:
            raise BadRequestException(message="Another group with this name already exists")

    updated_group = await group_repository.update(db, db_obj=db_group, obj_in=data)
    
    # Calculate count for return schema
    counts_dict, _ = await group_repository.search_groups_with_counts(db, skip=0, limit=1, search=updated_group.name)
    if counts_dict:
        updated_group.contact_count = counts_dict[0].contact_count
    else:
        updated_group.contact_count = 0

    return {
        "success": True,
        "message": "Group updated successfully",
        "data": GroupResponse.model_validate(updated_group),
        "errors": None
    }

@router.delete("/{group_id}", response_model=None, dependencies=[Depends(require_operator)])
async def delete_group(
    group_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a contact group (soft delete).
    """
    db_group = await group_repository.get(db, id=group_id)
    if not db_group:
        raise NotFoundException(message="Group not found")

    await group_repository.remove(db, id=group_id, soft=True)
    return {
        "success": True,
        "message": "Group deleted successfully",
        "data": None,
        "errors": None
    }

@router.post("/{group_id}/contacts", response_model=None, status_code=status.HTTP_200_OK, dependencies=[Depends(require_operator)])
async def associate_contacts_with_group(
    group_id: uuid.UUID,
    payload: AssociateContactsRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Add multiple contacts to a contact group.
    """
    db_group = await group_repository.get(db, id=group_id)
    if not db_group:
        raise NotFoundException(message="Group not found")

    added_count = await group_repository.add_contacts_to_group(
        db,
        group_id=group_id,
        contact_ids=payload.contact_ids
    )

    return {
        "success": True,
        "message": f"Successfully associated {added_count} contacts with the group",
        "data": {
            "group_id": group_id,
            "associated_count": added_count
        },
        "errors": None
    }
