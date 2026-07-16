from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user, require_manager, require_viewer
from app.models.user import User
from app.repositories.setting import setting_repository
from app.schemas.setting import SettingResponse, SettingUpdate

router = APIRouter(prefix="/settings", tags=["Settings"])

@router.get("", response_model=None, dependencies=[Depends(require_viewer)])
async def get_settings(db: AsyncSession = Depends(get_db)):
    """
    Retrieve application configuration, SMS balances, and default properties.
    """
    db_settings = await setting_repository.get_settings(db)
    return {
        "success": True,
        "message": "Settings retrieved successfully",
        "data": SettingResponse.model_validate(db_settings),
        "errors": None
    }

@router.put("", response_model=None)
async def update_settings(
    data: SettingUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update details of the application configuration and credentials. Requires Manager or higher.
    """
    require_manager(current_user)
    
    db_settings = await setting_repository.get_settings(db)
    
    # Perform update using schema filter (validates & processes parameters)
    updated_settings = await setting_repository.update(
        db,
        db_obj=db_settings,
        obj_in=data
    )
    
    return {
        "success": True,
        "message": "Settings updated successfully",
        "data": SettingResponse.model_validate(updated_settings),
        "errors": None
    }
