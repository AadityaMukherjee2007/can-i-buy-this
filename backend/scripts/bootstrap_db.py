"""Run once to create all DB tables on the target database.

Usage:
    DATABASE_URL="postgresql+asyncpg://..." python scripts/bootstrap_db.py

If DATABASE_URL is not set, it reads from app.config (which reads from .env).
"""

import os
import sys
import asyncio

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


async def main():
    if url := os.environ.get("DATABASE_URL"):
        from sqlalchemy.ext.asyncio import create_async_engine
        from app.database import Base

        engine = create_async_engine(url)
    else:
        from app.database import engine, Base

    print(f"Creating tables on {engine.url.render_as_string(hide_password=False)}")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()
    print("Done — all tables created.")


if __name__ == "__main__":
    asyncio.run(main())
