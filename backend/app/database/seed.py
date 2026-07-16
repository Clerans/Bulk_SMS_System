import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.core.database import SessionLocal, engine, Base
from app.core.security import hash_password
from app.models.user import User, UserRole, UserStatus
from app.repositories.user import user_repository

async def seed_users(db: AsyncSession) -> None:
    logger.info("Seeding default users...")
    
    # 1. Default Admin User
    admin_email = "anika@cafechai.lk"
    admin = await user_repository.get_by_email(db, email=admin_email)
    if not admin:
        admin_data = {
            "name": "Anika Perera",
            "email": admin_email,
            "password": hash_password("admin123"),
            "role": UserRole.ADMIN,
            "status": UserStatus.ACTIVE
        }
        await user_repository.create(db, obj_in=admin_data)
        logger.info(f"Created default Admin user: {admin_email}")
    else:
        logger.info(f"Admin user already exists: {admin_email}")

    # 2. Default Operator User
    operator_email = "operator@cafechai.lk"
    operator = await user_repository.get_by_email(db, email=operator_email)
    if not operator:
        operator_data = {
            "name": "Dilshan Silva",
            "email": operator_email,
            "password": hash_password("operator123"),
            "role": UserRole.OPERATOR,
            "status": UserStatus.ACTIVE
        }
        await user_repository.create(db, obj_in=operator_data)
        logger.info(f"Created default Operator user: {operator_email}")
    else:
        logger.info(f"Operator user already exists: {operator_email}")

async def main() -> None:
    # Ensure tables are created (for development when running seeding directly)
    from sqlalchemy import text
    async with engine.begin() as conn:
        # Cascade drop public schema to wipe all legacy tables and foreign keys
        try:
            await conn.execute(text("DROP SCHEMA public CASCADE;"))
            await conn.execute(text("CREATE SCHEMA public;"))
            await conn.execute(text("GRANT ALL ON SCHEMA public TO public;"))
            logger.info("Database schema wiped successfully.")
        except Exception as e:
            logger.warning(f"Drop schema failed: {str(e)}. Attempting metadata drop...")
            await conn.run_sync(Base.metadata.drop_all)
            
        # Create all tables matching current models
        await conn.run_sync(Base.metadata.create_all)
        
    async with SessionLocal() as session:
        try:
            await seed_users(session)
            logger.success("Database seeding completed successfully.")
        except Exception as e:
            logger.error(f"Error seeding database: {str(e)}")
            raise

if __name__ == "__main__":
    asyncio.run(main())
