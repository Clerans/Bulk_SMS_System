import asyncio
from typing import AsyncGenerator, Generator
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import app

# Use in-memory SQLite for high-performance testing with zero dependency
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """
    Spawns session-wide asyncio event loop.
    """
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """
    Creates all tables in the test database on session start, and drops on completion.
    """
    async def create_tables():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async def drop_tables():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)

    asyncio.run(create_tables())
    yield
    asyncio.run(drop_tables())

@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Provides a clean, transaction-rolled-back database session per test.
    """
    async with TestingSessionLocal() as session:
        yield session
        # Clean up any written tables between runs
        await session.rollback()

@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    FastAPI testing HTTP client with database sessions overridden.
    """
    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    
    # Configure Async HTTPX Client wrapping the FastAPI application ASGI instance
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver/api/v1"
    ) as ac:
        yield ac
        
    app.dependency_overrides.clear()
