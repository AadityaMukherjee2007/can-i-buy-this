import os
from contextlib import asynccontextmanager

import sqlalchemy as sa
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

from app.database import engine, Base
from app.api import auth, evaluate, business, transactions, saltedge

_is_serverless = os.environ.get("NETLIFY") == "true" or os.environ.get("VERCEL") == "1"


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

for url_var in ("NETLIFY_URL", "VERCEL_URL", "VERCEL_BRANCH_URL", "VERCEL_PROJECT_PRODUCTION_URL"):
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


handler = Mangum(app)
