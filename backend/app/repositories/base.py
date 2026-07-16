from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union
from pydantic import BaseModel
from sqlalchemy import select, update, delete, func, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import Base

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)

class BaseRepository(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """
    Generic Repository pattern base class implementing SOLID principles.
    Automatically handles soft-deleted models and provides flexible CRUD methods.
    """
    def __init__(self, model: Type[ModelType]):
        self.model = model

    async def get(self, db: AsyncSession, id: Any, include_deleted: bool = False) -> Optional[ModelType]:
        """
        Retrieve a single model instance by its primary key ID.
        """
        query = select(self.model).where(self.model.id == id)
        if not include_deleted and hasattr(self.model, "is_deleted"):
            query = query.where(self.model.is_deleted == False)
        
        result = await db.execute(query)
        return result.scalars().first()

    async def get_multi(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None,
        sort_by: Optional[str] = None,
        sort_order: str = "asc",
        include_deleted: bool = False
    ) -> List[ModelType]:
        """
        Retrieve list of model instances with pagination, filtering, and sorting.
        """
        query = select(self.model)
        
        # Apply soft-delete filter if applicable
        if not include_deleted and hasattr(self.model, "is_deleted"):
            query = query.where(self.model.is_deleted == False)
            
        # Apply key-value filters
        if filters:
            for attr, value in filters.items():
                if hasattr(self.model, attr) and value is not None:
                    query = query.where(getattr(self.model, attr) == value)
                    
        # Apply sorting
        if sort_by and hasattr(self.model, sort_by):
            sort_attr = getattr(self.model, sort_by)
            if sort_order.lower() == "desc":
                query = query.order_by(desc(sort_attr))
            else:
                query = query.order_by(asc(sort_attr))
        elif hasattr(self.model, "created_at"):
            query = query.order_by(desc(getattr(self.model, "created_at")))

        # Apply pagination limit/offset
        query = query.offset(skip).limit(limit)
        
        result = await db.execute(query)
        return list(result.scalars().all())

    async def count(
        self,
        db: AsyncSession,
        *,
        filters: Optional[Dict[str, Any]] = None,
        include_deleted: bool = False
    ) -> int:
        """
        Count total records matching filters (used for pagination metadata).
        """
        query = select(func.count()).select_from(self.model)
        
        if not include_deleted and hasattr(self.model, "is_deleted"):
            query = query.where(self.model.is_deleted == False)
            
        if filters:
            for attr, value in filters.items():
                if hasattr(self.model, attr) and value is not None:
                    query = query.where(getattr(self.model, attr) == value)
                    
        result = await db.execute(query)
        return result.scalar() or 0

    async def create(self, db: AsyncSession, *, obj_in: Union[CreateSchemaType, Dict[str, Any]]) -> ModelType:
        """
        Insert a new record in the database.
        """
        if isinstance(obj_in, dict):
            obj_in_data = obj_in
        else:
            obj_in_data = obj_in.model_dump()
            
        db_obj = self.model(**obj_in_data)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update(
        self,
        db: AsyncSession,
        *,
        db_obj: ModelType,
        obj_in: Union[UpdateSchemaType, Dict[str, Any]]
    ) -> ModelType:
        """
        Update an existing database record.
        """
        obj_data = db_obj.__dict__
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)
            
        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])
                
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def remove(self, db: AsyncSession, *, id: Any, soft: bool = True) -> Optional[ModelType]:
        """
        Delete a database record. Performs soft-delete by default if model supports it.
        """
        db_obj = await self.get(db, id=id, include_deleted=True)
        if not db_obj:
            return None

        if soft and hasattr(db_obj, "soft_delete"):
            db_obj.soft_delete()
            db.add(db_obj)
        else:
            await db.delete(db_obj)
            
        await db.commit()
        return db_obj

    async def restore(self, db: AsyncSession, *, id: Any) -> Optional[ModelType]:
        """
        Restore a soft-deleted record.
        """
        db_obj = await self.get(db, id=id, include_deleted=True)
        if db_obj and hasattr(db_obj, "restore"):
            db_obj.restore()
            db.add(db_obj)
            await db.commit()
            await db.refresh(db_obj)
            return db_obj
        return None
