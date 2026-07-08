import os
from contextlib import asynccontextmanager

import sqlalchemy as sa
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base, async_session_factory
from app.api import auth, evaluate, business, transactions, saltedge

_is_serverless = os.environ.get("NETLIFY") == "true"


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not _is_serverless and engine is not None:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            try:
                await conn.execute(
                    sa.text("ALTER TABLE businesses RENAME COLUMN plaid_access_token TO saltedge_customer_id")
                )
            except Exception:
                pass
            try:
                await conn.execute(
                    sa.text("ALTER TABLE businesses RENAME COLUMN plaid_item_id TO saltedge_connection_id")
                )
            except Exception:
                pass
            try:
                await conn.execute(
                    sa.text("ALTER TABLE transactions RENAME COLUMN plaid_transaction_id TO saltedge_transaction_id")
                )
            except Exception:
                pass

        from app.models.business import Business
        from app.models.transaction import Transaction
        from datetime import datetime, timedelta
        import random

        async with async_session_factory() as session:
            result = await session.execute(sa.select(Business))
            businesses = result.scalars().all()
            for biz in businesses:
                existing = await session.execute(
                    sa.select(Transaction).where(Transaction.business_id == biz.id).limit(1)
                )
                if existing.scalar_one_or_none():
                    continue
                today = datetime.utcnow().date()
                income_dates = [
                    today - timedelta(days=d) for d in range(2, 85, 4)
                ]
                expense_dates = [
                    today - timedelta(days=d) for d in range(1, 86, 1)
                    if d % 3 != 0 and d not in [x for x in range(2, 85, 4)]
                ]
                random.shuffle(expense_dates)
                expense_dates = expense_dates[:min(len(expense_dates), 55)]
                for dt in income_dates[:20]:
                    amt = round(random.uniform(200, 5000), 2)
                    session.add(Transaction(
                        business_id=biz.id,
                        saltedge_transaction_id=f"seed_in_{dt.isoformat()}_{amt}",
                        amount=amt,
                        date=dt,
                        description=f"Invoice payment {random.choice(['Client A', 'Client B', 'Consulting', 'Freelance'])}",
                        category="income",
                        is_inflow=True,
                    ))
                for dt in expense_dates:
                    amount = -round(random.uniform(10, 1500), 2)
                    descs = ["Office supplies", "Software subscription", "Utilities", "Contractor payment", "Marketing", "Rent", "Insurance", "Travel"]
                    session.add(Transaction(
                        business_id=biz.id,
                        saltedge_transaction_id=f"seed_out_{dt.isoformat()}_{abs(amount)}",
                        amount=amount,
                        date=dt,
                        description=random.choice(descs),
                        category="expense",
                        is_inflow=False,
                    ))
                await session.commit()
    yield


app = FastAPI(
    title="Can I Buy This?",
    description="Financial decision engine for small business owners",
    version="0.1.0",
    lifespan=lifespan,
)

origins = [
    "http://localhost:3000",
    "https://localhost:3000",
]

for url_var in ("NETLIFY_URL", "VERCEL_URL", "VERCEL_BRANCH_URL"):
    url = os.environ.get(url_var)
    if url:
        origins.append(f"https://{url}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(evaluate.router)
app.include_router(business.router)
app.include_router(transactions.router)
app.include_router(saltedge.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
