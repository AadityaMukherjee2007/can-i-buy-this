import os
from contextlib import asynccontextmanager

import sqlalchemy as sa
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.database import engine, Base
from app.api import auth, evaluate, business, transactions, saltedge


@asynccontextmanager
async def lifespan(app: FastAPI):
    if engine is not None:
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
                for stmt in (
                    "ALTER TABLE businesses RENAME COLUMN plaid_access_token TO saltedge_customer_id",
                    "ALTER TABLE businesses RENAME COLUMN plaid_item_id TO saltedge_connection_id",
                    "ALTER TABLE transactions RENAME COLUMN plaid_transaction_id TO saltedge_transaction_id",
                ):
                    try:
                        await conn.execute(sa.text(stmt))
                    except Exception:
                        pass
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


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"{type(exc).__name__}: {exc}"},
    )


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/health/db")
async def health_db():
    try:
        from app.database import async_session_factory

        async with async_session_factory() as s:
            await s.execute(sa.text("SELECT 1"))
            return {"status": "ok", "database": "connected"}
    except OSError:
        return {
            "status": "error",
            "database": "Cannot connect to database. If using Supabase, enable the "
            "connection pooler (Supavisor) in your Supabase dashboard and use the "
            "pooler connection string as DATABASE_URL. Supabase direct "
            "connections are IPv6-only and Vercel requires IPv4.",
        }
    except Exception as e:
        return {"status": "error", "database": f"{type(e).__name__}: {e}"}
