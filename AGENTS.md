# Can I Buy This? — Agent Guide

## Stack

- **Frontend**: Next.js 16.2.10 (Turbopack), React 19, Tailwind CSS v4, Recharts, framer-motion
- **Backend**: Python 3.12, FastAPI 0.111, SQLAlchemy 2.0 async, asyncpg
- **Infra**: Docker Compose (backend, frontend), no CI/CD

## Commands

```bash
# Frontend (from frontend/)
npm run lint      # ESLint v9 (flat config)
npm run build     # next build (Turbopack for dev)

# Backend (from backend/, requires .env or Docker)
uvicorn app.main:app --reload --port 8000
python -m pytest tests/ -v    # 12 decision engine tests, no fixtures needed

# Docker (from repo root)
docker compose up --build      # 2 services: backend, frontend(:3000)
```

## Architecture

Backend layers: `app/models/` (SQLAlchemy `Mapped`/`mapped_column`) → `app/schemas/` (Pydantic) → `app/api/` (FastAPI routes) → `app/services/` (business logic) → `app/workers/` (Celery tasks, removed — dead code).

Frontend: `src/app/` (App Router pages), `src/components/` (client components), `src/lib/` (auth + utilities). `@/` maps to `./src/`.

No Alembic migrations — `Base.metadata.create_all` runs on startup via FastAPI lifespan event.

## Deployment (Vercel)

- **Two separate Vercel projects**: frontend (`frontend/`) and backend (`backend/`).
- **Frontend** → auto-detects Next.js. Set `NEXT_PUBLIC_API_URL` to backend Vercel URL.
- **Backend** → auto-detects Python FastAPI via `pyproject.toml` entrypoint. Set `DATABASE_URL`, `JWT_SECRET`, `SALTEDGE_APP_ID`, `SALTEDGE_SECRET`, `SALTEDGE_ENV` in Vercel dashboard.
- **.env.example** is the unified config reference. Copy to `.env` for Docker.

## Key gotchas

- **Tailwind CSS v4**: uses `@import "tailwindcss"` + `@theme inline {}` directive, NOT v3 `@tailwind`. Configure via CSS, not `tailwind.config`.
- **Plaid SDK v27**: `Environment.Development` removed. Only `Sandbox` and `Production`.
- **Celery**: removed (dead code — was only for Plaid sync which had no trigger endpoint).
- **Auth is localStorage-based** (`token`/`user` keys in `src/lib/auth.tsx`). API URL from `NEXT_PUBLIC_API_URL`; default empty (same-origin).
- **Lint override**: `react-hooks/set-state-in-effect` is disabled for `src/lib/auth.tsx` and `src/hooks/useBusiness.ts` (necessary pattern for localStorage sync).
- **On-demand transaction seeding**: new users get seeded transactions on first `/api/evaluate` call instead of dummy data.
- **Curvilinear projections**: decision engine uses wavy (weekday-pattern) 90-day cash flow trajectories, not straight lines.
- **`fmt()`** currency formatter lives in `src/lib/format.ts` — shared across components. Always import from there.
- **Decision engine** (`app/services/decision_engine.py`) has 12 standalone accuracy tests. No API, DB, or fixture dependencies.
- **CORS** dynamically allows `http://localhost:3000` + `VERCEL_PROJECT_PRODUCTION_URL` + `VERCEL_URL`.
- **`backend/Dockerfile`** runs `pip install` with no cache — cache-busts clean.
- **`frontend/Dockerfile`** runs `npm install` on start (not build-time) for live reload support.
