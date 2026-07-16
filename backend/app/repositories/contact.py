import uuid
from typing import Optional, List, Tuple
from sqlalchemy import select, func, or_, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.contact import Contact, ContactStatus
from app.models.group import Group
from app.repositories.base import BaseRepository
from app.schemas.contact import ContactCreate, ContactUpdate

class ContactRepository(BaseRepository[Contact, ContactCreate, ContactUpdate]):
    """
    Contact repository implementing custom query filters for subscribers.
    """
    def __init__(self):
        super().__init__(Contact)

    async def get_with_groups(self, db: AsyncSession, id: uuid.UUID) -> Optional[Contact]:
        """
        Get contact by ID while pre-loading groups.
        """
        query = (
            select(self.model)
            .where(self.model.id == id, self.model.is_deleted == False)
            .options(selectinload(self.model.groups))
        )
        result = await db.execute(query)
        return result.scalars().first()

    async def get_by_phone(self, db: AsyncSession, phone: str) -> Optional[Contact]:
        """
        Get active contact by phone number.
        """
        query = select(self.model).where(
            self.model.phone == phone,
            self.model.is_deleted == False
        )
        result = await db.execute(query)
        return result.scalars().first()

    async def search_contacts(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        group_name: Optional[str] = None,
        status: Optional[ContactStatus] = None,
        sort_by: Optional[str] = None,
        sort_order: str = "desc"
    ) -> Tuple[List[Contact], int]:
        """
        Find contacts with advanced filters (search, group name, status), sorting, and pagination.
        """
        query = select(self.model).where(self.model.is_deleted == False).options(selectinload(self.model.groups))

        # Filter by Group Name if provided (join groups table)
        if group_name:
            query = query.join(self.model.groups).where(Group.name == group_name)

        # Apply general search terms (first_name, last_name, phone, email, company)
        if search:
            search_clause = or_(
                self.model.first_name.ilike(f"%{search}%"),
                self.model.last_name.ilike(f"%{search}%"),
                self.model.phone.ilike(f"%{search}%"),
                self.model.email.ilike(f"%{search}%"),
                self.model.company.ilike(f"%{search}%")
            )
            query = query.where(search_clause)

        # Filter by status
        if status:
            query = query.where(self.model.status == status)

        # Count total matches
        count_query = select(func.count()).select_from(query.subquery())
        count_result = await db.execute(count_query)
        total = count_result.scalar() or 0

        # Apply sorting
        if sort_by and hasattr(self.model, sort_by):
            sort_attr = getattr(self.model, sort_by)
            if sort_order.lower() == "desc":
                query = query.order_by(desc(sort_attr))
            else:
                query = query.order_by(asc(sort_attr))
        else:
            query = query.order_by(desc(self.model.created_at))

        # Apply pagination
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        items = list(result.scalars().all())

        return items, total

contact_repository = ContactRepository()
