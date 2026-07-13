import os
from contextlib import asynccontextmanager

import sqlalchemy as sa
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.database import engine, Base
from app.api import auth, evaluate, business, transactions


@asynccontextmanager
async def lifespan(app: FastAPI):
    if engine is not None:
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
                await conn.execute(sa.text("ALTER TABLE businesses ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD'"))
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


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, StarletteHTTPException):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    return JSONResponse(status_code=500, content={"detail": f"{type(exc).__name__}: {exc}"})


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
