import os
import re

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.config import settings

_is_serverless = os.environ.get("NETLIFY") == "true" or os.environ.get("VERCEL") == "1"

_db_url = settings.database_url

m = re.match(r"^(.+://)([^:]+)(?::(.*))?@db\.([^.]+)\.supabase\.co:5432(/[^?]*)", _db_url)
if m and _is_serverless:
    pw_part = f":{m.group(3)}" if m.group(3) else ""
    _db_url = (
        f"{m.group(1)}{m.group(2)}.{m.group(4)}{pw_part}"
        f"@aws-0-ap-southeast-1.pooler.supabase.com:6543"
        f"{m.group(5) or '/postgres'}?sslmode=require"
    )

engine = create_async_engine(
    _db_url,
    echo=False,
    poolclass=NullPool if _is_serverless else None,
    pool_size=5 if not _is_serverless else None,
    max_overflow=5 if not _is_serverless else None,
    connect_args={"timeout": 5}
    | ({"ssl": "require"} if "sslmode=require" in _db_url or "ssl=require" in _db_url else {}),
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
