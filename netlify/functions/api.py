import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend"))

os.environ["NETLIFY"] = "true"

from mangum import Mangum
from app.main import app
from app.database import engine, Base


async def _init_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


try:
    asyncio.run(_init_tables())
except Exception:
    pass

handler = Mangum(app, lifespan="off")
