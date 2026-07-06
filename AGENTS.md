# Can I Buy This? — Agent Guide

## Stack

- **Frontend**: Next.js 16.2.10 (Turbopack), React 19, Tailwind CSS v4, Recharts, framer-motion
- **Backend**: Python 3.12, FastAPI 0.111, SQLAlchemy 2.0 async, asyncpg
- **Infra**: Docker Compose (Postgres 16, Redis 7, Celery 5), no CI/CD

## Commands

```bash
# Frontend (from frontend/)
npm run lint      # ESLint v9 (flat config)
npm run build     # next build (Turbopack for dev)

# Backend (from backend/, requires .env or Docker)
uvicorn app.main:app --reload --port 8000
python -m pytest tests/ -v    # 12 decision engine tests, no fixtures needed

# Docker (from repo root)
docker compose up --build      # 5 services: db(:5433), redis, backend, celery_worker, frontend(:3000)
```

## Architecture

Backend layers: `app/models/` (SQLAlchemy `Mapped`/`mapped_column`) → `app/schemas/` (Pydantic) → `app/api/` (FastAPI routes) → `app/services/` (business logic) → `app/workers/` (Celery tasks).

Frontend: `src/app/` (App Router pages), `src/components/` (client components), `src/lib/` (auth + utilities). `@/` maps to `./src/`.

No Alembic migrations — `Base.metadata.create_all` runs on startup via FastAPI lifespan event.

## Key gotchas

- **Tailwind CSS v4**: uses `@import "tailwindcss"` + `@theme inline {}` directive, NOT v3 `@tailwind`. Configure via CSS, not `tailwind.config`.
- **Plaid SDK v27**: `Environment.Development` removed. Only `Sandbox` and `Production`.
- **Celery**: needs `broker_connection_retry_on_startup=True` in config (suppresses deprecation warning).
- **No `.env` committed**: copy `.env.example`. Config reads via pydantic-settings.
- **Auth is localStorage-based** (`token`/`user` keys in `src/lib/auth.tsx`). API URL hardcoded to `http://localhost:8000`.
- **Lint override**: `react-hooks/set-state-in-effect` is disabled for `src/lib/auth.tsx` and `src/hooks/useBusiness.ts` (necessary pattern for localStorage sync).
- **Backend uses dummy data** ($10k cash, synthetic inflows) when no transactions exist — only activates when `transactions` table is empty.
- **Plaid sync** (Celery task) exists but has no trigger endpoint – dead code unless invoked manually.
- **`fmt()`** currency formatter lives in `src/lib/format.ts` — shared across components. Always import from there.
- **Decision engine** (`app/services/decision_engine.py`) has 12 standalone accuracy tests. No API, DB, or fixture dependencies.
- **CORS** allows only `http://localhost:3000` — update `backend/app/main.py` if frontend runs elsewhere.
- **`backend/Dockerfile`** runs `pip install` with no cache — cache-busts clean.
- **`frontend/Dockerfile`** runs `npm install` on start (not build-time) for live reload support.
