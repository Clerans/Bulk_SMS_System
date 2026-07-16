from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.setting import Setting
from app.repositories.base import BaseRepository
from app.schemas.setting import SettingBase, SettingUpdate

class SettingRepository(BaseRepository[Setting, SettingBase, SettingUpdate]):
    """
    Setting repository ensuring single-row access control to configuration parameters.
    """
    def __init__(self):
        super().__init__(Setting)

    async def get_settings(self, db: AsyncSession) -> Setting:
        """
        Retrieves the global App Settings record.
        Auto-generates one with default values if the table is empty.
        """
        query = select(self.model)
        result = await db.execute(query)
        db_settings = result.scalars().first()

        if not db_settings:
            # Instantiate settings with schema-defined defaults
            db_settings = self.model()
            db.add(db_settings)
            await db.commit()
            await db.refresh(db_settings)
            
        return db_settings

setting_repository = SettingRepository()
