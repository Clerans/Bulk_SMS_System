import uuid
from typing import Optional, List, Tuple
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.group import Group, group_contacts
from app.models.contact import Contact
from app.repositories.base import BaseRepository
from app.schemas.group import GroupCreate, GroupUpdate

class GroupRepository(BaseRepository[Group, GroupCreate, GroupUpdate]):
    """
    Group repository handling group queries and subscriber association counts.
    """
    def __init__(self):
        super().__init__(Group)

    async def get_by_name(self, db: AsyncSession, name: str) -> Optional[Group]:
        """
        Retrieve group by name.
        """
        query = select(self.model).where(
            self.model.name == name,
            self.model.is_deleted == False
        )
        result = await db.execute(query)
        return result.scalars().first()

    async def search_groups_with_counts(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None
    ) -> Tuple[List[Group], int]:
        """
        Fetch contact groups with contacts count per group, applying search and pagination filters.
        """
        # Select Group and Count of active contacts
        query = (
            select(self.model, func.count(Contact.id).label("contact_count"))
            .outerjoin(group_contacts, self.model.id == group_contacts.c.group_id)
            .outerjoin(Contact, (Contact.id == group_contacts.c.contact_id) & (Contact.is_deleted == False))
            .where(self.model.is_deleted == False)
            .group_by(self.model.id)
        )

        if search:
            query = query.where(self.model.name.ilike(f"%{search}%"))

        # Calculate total records matching search filters
        count_query = select(func.count()).select_from(query.subquery())
        count_result = await db.execute(count_query)
        total = count_result.scalar() or 0

        # Sort, Paginate and execute
        query = query.order_by(self.model.name.asc()).offset(skip).limit(limit)
        result = await db.execute(query)
        rows = result.all()

        items = []
        for group, count in rows:
            # Inject the calculated contact count into the ORM object dynamically
            # this aligns with Pydantic's from_attributes field mapper.
            group.contact_count = count
            items.append(group)

        return items, total

    async def add_contacts_to_group(
        self,
        db: AsyncSession,
        *,
        group_id: uuid.UUID,
        contact_ids: List[uuid.UUID]
    ) -> int:
        """
        Associate multiple contacts with a group in bulk.
        """
        added_count = 0
        for cid in contact_ids:
            # Check if association already exists
            dup_query = select(group_contacts).where(
                group_contacts.c.group_id == group_id,
                group_contacts.c.contact_id == cid
            )
            dup_res = await db.execute(dup_query)
            if not dup_res.first():
                stmt = group_contacts.insert().values(group_id=group_id, contact_id=cid)
                await db.execute(stmt)
                added_count += 1
        
        if added_count > 0:
            await db.commit()
            
        return added_count

group_repository = GroupRepository()
