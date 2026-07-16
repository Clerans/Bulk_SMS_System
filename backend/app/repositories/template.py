from typing import List, Optional, Tuple
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.template import SMSTemplate, TemplateCategory
from app.repositories.base import BaseRepository
from app.schemas.template import TemplateCreate, TemplateUpdate

class TemplateRepository(BaseRepository[SMSTemplate, TemplateCreate, TemplateUpdate]):
    """
    Template repository handling database operations for message templates.
    """
    def __init__(self):
        super().__init__(SMSTemplate)

    async def search_templates(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        category: Optional[TemplateCategory] = None
    ) -> Tuple[List[SMSTemplate], int]:
        """
        Search and page SMS templates by name (title) or message contents, and filter by category.
        """
        query = select(self.model).where(self.model.is_deleted == False)

        if search:
            query = query.where(
                or_(
                    self.model.title.ilike(f"%{search}%"),
                    self.model.message.ilike(f"%{search}%")
                )
            )

        if category:
            query = query.where(self.model.category == category)

        # Count total records matching filter criteria
        count_query = select(func.count()).select_from(query.subquery())
        count_result = await db.execute(count_query)
        total = count_result.scalar() or 0

        # Sort and page
        query = query.order_by(self.model.created_at.desc()).offset(skip).limit(limit)
        result = await db.execute(query)
        items = list(result.scalars().all())

        return items, total

template_repository = TemplateRepository()
