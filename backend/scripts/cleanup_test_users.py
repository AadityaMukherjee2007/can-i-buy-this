import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select, delete
from app.database import async_session_factory, engine
from app.models.user import User
from app.models.scenario import Scenario


async def cleanup():
    print("Connecting to database...")

    async with async_session_factory() as session:
        result = await session.execute(
            select(User).where(User.email.like("%@example.com"))
        )
        users = result.scalars().all()

        if not users:
            print("No test users found (no @example.com emails).")
            return

        print(f"Found {len(users)} test user(s):")
        for u in users:
            print(f"  {u.email} ({u.full_name})")

        await session.execute(
            delete(Scenario).where(Scenario.user_id.in_([u.id for u in users]))
        )
        await session.execute(
            delete(User).where(User.email.like("%@example.com"))
        )
        await session.commit()

        print(f"Deleted {len(users)} test user(s) and their scenarios.")


if __name__ == "__main__":
    asyncio.run(cleanup())
