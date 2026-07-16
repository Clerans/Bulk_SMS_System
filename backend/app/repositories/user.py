from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole, UserStatus
from app.repositories.base import BaseRepository
from app.schemas.user import UserCreate, UserUpdate

class UserRepository(BaseRepository[User, UserCreate, UserUpdate]):
    """
    User repository handling user-specific database queries.
    """
    def __init__(self):
        super().__init__(User)

    async def get_by_email(self, db: AsyncSession, email: str) -> Optional[User]:
        """
        Retrieve a user record matching the given email address.
        """
        query = select(self.model).where(
            self.model.email == email,
            self.model.is_deleted == False
        )
        result = await db.execute(query)
        return result.scalars().first()

    async def search_users(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        role: Optional[UserRole] = None,
        status: Optional[UserStatus] = None
    ) -> tuple[list[User], int]:
        """
        Search and filter users by query term, role, and status, with pagination.
        """
        from sqlalchemy import or_
        query = select(self.model).where(self.model.is_deleted == False)
        
        if search:
            query = query.where(
                or_(
                    self.model.name.ilike(f"%{search}%"),
                    self.model.email.ilike(f"%{search}%")
                )
            )
            
        if role:
            query = query.where(self.model.role == role)
        if status:
            query = query.where(self.model.status == status)

        # Get total count matching criteria
        count_query = select(func.count()).select_from(query.subquery())
        count_result = await db.execute(count_query)
        total = count_result.scalar() or 0

        # Paginate results
        query = query.order_by(self.model.created_at.desc()).offset(skip).limit(limit)
        result = await db.execute(query)
        items = list(result.scalars().all())

        return items, total

user_repository = UserRepository()
