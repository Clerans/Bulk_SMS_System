import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import NotFoundException
from app.dependencies.auth import get_current_user, require_operator, require_viewer
from app.models.template import TemplateCategory
from app.models.user import User
from app.repositories.template import template_repository
from app.schemas.template import TemplateCreate, TemplateResponse, TemplateUpdate

router = APIRouter(prefix="/templates", tags=["Templates"])

@router.get("", response_model=None, dependencies=[Depends(require_viewer)])
async def get_templates(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    category: Optional[TemplateCategory] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve message templates (paginated, sorted, and filtered by search text and category).
    """
    items, total = await template_repository.search_templates(
        db,
        skip=skip,
        limit=limit,
        search=search,
        category=category
    )
    
    return {
        "success": True,
        "message": "Templates retrieved successfully",
        "data": {
            "items": [TemplateResponse.model_validate(item) for item in items],
            "total": total,
            "skip": skip,
            "limit": limit
        },
        "errors": None
    }

@router.post("", response_model=None, status_code=status.HTTP_201_CREATED)
async def create_template(
    data: TemplateCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new SMS Template. Requires Operator permissions or higher.
    """
    # Enforce Operator role permission
    require_operator(current_user)
    
    template_data = data.model_dump()
    template_data["created_by"] = current_user.id
    
    new_template = await template_repository.create(db, obj_in=template_data)
    
    return {
        "success": True,
        "message": "Template created successfully",
        "data": TemplateResponse.model_validate(new_template),
        "errors": None
    }

@router.put("/{template_id}", response_model=None)
async def update_template(
    template_id: uuid.UUID,
    data: TemplateUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update details of an SMS Template. Requires Operator permissions or higher.
    """
    require_operator(current_user)
    
    db_template = await template_repository.get(db, id=template_id)
    if not db_template:
        raise NotFoundException(message="Template not found")
        
    updated_template = await template_repository.update(
        db,
        db_obj=db_template,
        obj_in=data
    )
    
    return {
        "success": True,
        "message": "Template updated successfully",
        "data": TemplateResponse.model_validate(updated_template),
        "errors": None
    }

@router.delete("/{template_id}", response_model=None)
async def delete_template(
    template_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a template (soft delete). Requires Operator permissions or higher.
    """
    require_operator(current_user)
    
    db_template = await template_repository.get(db, id=template_id)
    if not db_template:
        raise NotFoundException(message="Template not found")
        
    await template_repository.remove(db, id=template_id, soft=True)
    
    return {
        "success": True,
        "message": "Template deleted successfully",
        "data": None,
        "errors": None
    }
