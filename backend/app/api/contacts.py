import uuid
from typing import Optional
from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import BadRequestException, NotFoundException
from app.dependencies.auth import get_current_user, require_operator, require_viewer
from app.models.contact import Contact, ContactStatus
from app.models.user import User
from app.repositories.contact import contact_repository
from app.repositories.group import group_repository
from app.schemas.contact import ContactCreate, ContactResponse, ContactUpdate
from app.services.file_service import file_service

router = APIRouter(prefix="/contacts", tags=["Contacts"])

@router.get("", response_model=None, dependencies=[Depends(require_viewer)])
async def get_contacts(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    group_name: Optional[str] = Query(None, alias="group"),
    status_filter: Optional[ContactStatus] = Query(None, alias="status"),
    sort_by: Optional[str] = Query(None),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve list of contacts with pagination, sorting, search, and status/group filters.
    """
    items, total = await contact_repository.search_contacts(
        db,
        skip=skip,
        limit=limit,
        search=search,
        group_name=group_name,
        status=status_filter,
        sort_by=sort_by,
        sort_order=sort_order
    )
    
    return {
        "success": True,
        "message": "Contacts retrieved successfully",
        "data": {
            "items": [ContactResponse.model_validate(item) for item in items],
            "total": total,
            "skip": skip,
            "limit": limit
        },
        "errors": None
    }

@router.post("", response_model=None, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_operator)])
async def create_contact(
    data: ContactCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new contact and optionally assign them to a group.
    """
    # Check if contact already exists
    existing = await contact_repository.get_by_phone(db, phone=data.phone)
    if existing:
        raise BadRequestException(message="A contact with this phone number already exists")

    contact_data = data.model_dump()
    group_name = contact_data.pop("group_name", None)
    contact_data["created_by"] = current_user.id
    
    new_contact = await contact_repository.create(db, obj_in=contact_data)

    if group_name:
        group_name_clean = group_name.strip()
        grp = await group_repository.get_by_name(db, name=group_name_clean)
        if not grp:
            grp = await group_repository.create(
                db,
                obj_in={"name": group_name_clean, "description": "Auto-created on contact creation"}
            )
        await group_repository.add_contacts_to_group(
            db,
            group_id=grp.id,
            contact_ids=[new_contact.id]
        )
        
    # Re-fetch with groups loaded
    new_contact = await contact_repository.get_with_groups(db, id=new_contact.id)
    
    return {
        "success": True,
        "message": "Contact created successfully",
        "data": ContactResponse.model_validate(new_contact),
        "errors": None
    }

@router.put("/{contact_id}", response_model=None, dependencies=[Depends(require_operator)])
async def update_contact(
    contact_id: uuid.UUID,
    data: ContactUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update contact information.
    """
    db_contact = await contact_repository.get_with_groups(db, id=contact_id)
    if not db_contact:
        raise NotFoundException(message="Contact not found")

    update_data = data.model_dump(exclude_unset=True)
    group_name = update_data.pop("group_name", None)

    if "phone" in update_data:
        existing = await contact_repository.get_by_phone(db, phone=update_data["phone"])
        if existing and existing.id != contact_id:
            raise BadRequestException(message="Another contact with this phone number already exists")

    updated_contact = await contact_repository.update(db, db_obj=db_contact, obj_in=update_data)

    if group_name is not None:
        # Clear existing groups first if you want (simplifying here: check and assign new)
        group_name_clean = group_name.strip()
        if group_name_clean:
            grp = await group_repository.get_by_name(db, name=group_name_clean)
            if not grp:
                grp = await group_repository.create(
                    db,
                    obj_in={"name": group_name_clean, "description": "Auto-created on contact update"}
                )
            await group_repository.add_contacts_to_group(
                db,
                group_id=grp.id,
                contact_ids=[updated_contact.id]
            )
            
    # Re-fetch updated object with groups loaded
    updated_contact = await contact_repository.get_with_groups(db, id=updated_contact.id)

    return {
        "success": True,
        "message": "Contact updated successfully",
        "data": ContactResponse.model_validate(updated_contact),
        "errors": None
    }

@router.delete("/{contact_id}", response_model=None, dependencies=[Depends(require_operator)])
async def delete_contact(
    contact_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a contact (soft delete).
    """
    db_contact = await contact_repository.get(db, id=contact_id)
    if not db_contact:
        raise NotFoundException(message="Contact not found")

    await contact_repository.remove(db, id=contact_id, soft=True)
    return {
        "success": True,
        "message": "Contact deleted successfully",
        "data": None,
        "errors": None
    }

@router.post("/import", response_model=None, status_code=status.HTTP_200_OK)
async def import_contacts(
    file: UploadFile = File(...),
    default_prefix: str = Query("+94"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Import contacts in bulk from a CSV or Excel file. Auto-creates groups if specified in columns.
    """
    content = await file.read()
    stats = await file_service.import_contacts(
        db,
        file_content=content,
        filename=file.filename,
        user_id=current_user.id,
        default_prefix=default_prefix
    )
    return {
        "success": True,
        "message": "Contact import completed",
        "data": stats,
        "errors": None
    }

@router.get("/export", dependencies=[Depends(require_viewer)])
async def export_contacts(
    search: Optional[str] = Query(None),
    group_name: Optional[str] = Query(None, alias="group"),
    status_filter: Optional[ContactStatus] = Query(None, alias="status"),
    export_format: str = Query("csv", regex="^(csv|excel)$", alias="format"),
    db: AsyncSession = Depends(get_db)
):
    """
    Export all filtered contacts to a downloadable CSV or Excel file.
    """
    # Fetch all records without pagination limits for export
    items, _ = await contact_repository.search_contacts(
        db,
        skip=0,
        limit=1000000, # Large limit to export all matches
        search=search,
        group_name=group_name,
        status=status_filter
    )

    file_stream = await file_service.export_contacts(items, format_type=export_format)
    
    media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" if export_format == "excel" else "text/csv"
    extension = "xlsx" if export_format == "excel" else "csv"
    
    return StreamingResponse(
        file_stream,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename=contacts_export.{extension}"}
    )
