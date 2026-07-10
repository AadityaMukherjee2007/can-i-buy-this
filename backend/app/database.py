import os
import socket
import logging
import re

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.config import settings

logger = logging.getLogger(__name__)

_is_serverless = os.environ.get("NETLIFY") == "true" or os.environ.get("VERCEL") == "1"

_db_url = settings.database_url

if _is_serverless:
    m = re.match(
        r"^(.+://)([^:]+)(?::(.*))?@db\.([^.]+)\.supabase\.co:5432(/[^?]*)?",
        _db_url,
    )
    if m:
        scheme = m.group(1)
        user = m.group(2)
        pw = m.group(3) or ""
        project_ref = m.group(4)
        path = m.group(5) or "/postgres"
        try:
            socket.getaddrinfo(f"db.{project_ref}.supabase.co", 5432, socket.AF_INET, socket.SOCK_STREAM)
        except socket.gaierror:
            pw_part = f":{pw}" if pw else ""
            _db_url = (
                f"{scheme}{user}.{project_ref}{pw_part}"
                f"@aws-0-ap-southeast-1.pooler.supabase.com:6543"
                f"{path}?sslmode=require"
            )
            logger.info("Switched to Supabase pooler (ap-southeast-1)")

_engine_kwargs = {"echo": False}
if _is_serverless:
    _engine_kwargs["poolclass"] = NullPool
else:
    pool_size = 2 if os.environ.get("NETLIFY") else 5
    _engine_kwargs["pool_size"] = pool_size
    _engine_kwargs["max_overflow"] = pool_size

connect_args = {"timeout": 5}
if "sslmode=require" in _db_url or "ssl=require" in _db_url:
    connect_args["ssl"] = "require"
if connect_args:
    _engine_kwargs["connect_args"] = connect_args

engine = create_async_engine(_db_url, **_engine_kwargs)
async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_session() -> AsyncSession:
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()
