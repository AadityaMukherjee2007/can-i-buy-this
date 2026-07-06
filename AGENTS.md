# Can I Buy This? — Agent Guide

## Stack

- **Frontend**: Next.js 16.2.10 (Turbopack), React 19, Tailwind CSS v4, Recharts
- **Backend**: Python 3.12, FastAPI 0.111, SQLAlchemy 2.0 (async), asyncpg
- **Infra**: Docker Compose (Postgres 16, Redis 7, Celery 5), no CI/CD

## Docker

```bash
# Start everything (building first)
docker compose up --build

# You may need to stop local PostgreSQL first, or compose maps pg to host port 5433
```

5 services: `db` (pg:5432, host:5433), `redis` (6379), `backend` (uvicorn --reload :8000), `celery_worker`, `frontend` (Next.js dev :3000).

CORS allows only `http://localhost:3000` — update `backend/app/main.py` if frontend runs elsewhere.

## Framework quirks

- **Next.js 16** has breaking changes from prior versions. Read `node_modules/next/dist/docs/` before writing new code.
- **Tailwind CSS v4** — uses `@import "tailwindcss"` + `@theme inline {}` directive, NOT v3 `@tailwind` directives. Configure via CSS, not `tailwind.config`.
- **SQLAlchemy 2.0 async** — uses `Mapped`/`mapped_column`, async sessions, `select()` style. Sync sessions only in Celery workers.
- **Plaid SDK v27** — `Environment.Development` removed. Only `Sandbox` and `Production`.
- **Celery** — start with `--uid=nobody` to suppress superuser warning. Add `broker_connection_retry_on_startup=True` to config to suppress deprecation.

## Architecture

Backend layers: `app/models/` (SQLAlchemy ORM) → `app/schemas/` (Pydantic) → `app/api/` (FastAPI routes) → `app/services/` (business logic) → `app/workers/` (Celery tasks).

`app/models/__init__.py` re-exports all 4 models (User, Business, Transaction, Scenario).

Frontend: `src/app/` (Next.js App Router pages), `src/components/` (React client components), `src/lib/` (auth context + utilities). Path alias `@/` → `./src/`.

## Key gotchas

- **No Alembic migrations** — `main.py` calls `Base.metadata.create_all` on startup. No migration history exists.
- **No `.env` file** — config reads from `.env` via pydantic-settings but none is committed. Copy `.env.example`.
- **Auth is localStorage-based** — token + user JSON stored under `token`/`user` keys. No httpOnly cookies. API URL hardcoded to `http://localhost:8000` in `src/lib/auth.tsx:21`.
- **Stripe** in requirements.txt but not wired to any route or frontend.
- **No tests** anywhere in the repo.
- **Plaid sync** task exists but has no trigger endpoint — it's dead code unless called manually.
- **Backend falls back to dummy cash ($10k) and inflows ($1k/$2k/$1.5k)** when no transactions exist.

## Commands

```bash
# Frontend
cd frontend && npm run dev    # dev server (Next.js Turbopack)
cd frontend && npm run build    # production build
cd frontend && npm run lint     # ESLint v9

# Backend (outside Docker)
cd backend && uvicorn app.main:app --reload --port 8000
```
