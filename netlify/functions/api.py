import asyncio
import os
import sys
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

os.environ["NETLIFY"] = "true"

from mangum import Mangum
from app.main import app
from app.database import engine, Base


async def _init_tables():
    logger.info("Initializing database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables ready.")


try:
    asyncio.run(_init_tables())
except RuntimeError:
    logger.warning("Event loop already running — skipping table init")
except Exception as e:
    logger.error("Table init failed: %s", e)

handler = Mangum(app, lifespan="off")
