import os
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.config import settings

_is_serverless = os.environ.get("NETLIFY") == "true" or os.environ.get("VERCEL") == "1"

_engine_kwargs = {"echo": False}
if _is_serverless:
    _engine_kwargs["poolclass"] = NullPool
else:
    _pool_size = 2 if os.environ.get("NETLIFY") else 5
    _engine_kwargs["pool_size"] = _pool_size
    _engine_kwargs["max_overflow"] = _pool_size

connect_args = {}
if "ssl=require" in settings.database_url:
    connect_args["ssl"] = "require"
if connect_args:
    _engine_kwargs["connect_args"] = connect_args

engine = create_async_engine(settings.database_url, **_engine_kwargs)
async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_session() -> AsyncSession:
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()
