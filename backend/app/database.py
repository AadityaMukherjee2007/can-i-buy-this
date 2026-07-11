import os

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.config import settings

_is_serverless = os.environ.get("NETLIFY") == "true" or os.environ.get("VERCEL") == "1"

_url = settings.database_url

ssl = {}
if "sslmode=require" in _url or "ssl=require" in _url:
    ssl["ssl"] = "require"

engine = create_async_engine(
    _url,
    echo=False,
    poolclass=NullPool if _is_serverless else None,
    connect_args={"timeout": 5, **ssl},
)

async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_session() -> AsyncSession:
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()
