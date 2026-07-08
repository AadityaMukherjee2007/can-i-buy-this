import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.api import auth, evaluate, business, transactions, saltedge

_is_serverless = os.environ.get("NETLIFY") == "true"


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not _is_serverless and engine is not None:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
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

netlify_url = os.environ.get("NETLIFY_URL")
if netlify_url:
    origins.append(netlify_url)

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
