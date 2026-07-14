# Can I Buy This? — Agent Guide

## Stack

- **Frontend**: Next.js 16.2.10 (Turbopack), React 19, Tailwind CSS v4, Recharts, framer-motion
- **Backend**: Python 3.12, FastAPI 0.111, SQLAlchemy 2.0 async, asyncpg
- **Infra**: Docker Compose, no CI/CD

## Commands

```bash
# Frontend (from frontend/)
npm run lint      # ESLint v9 flat config
npm run build     # next build (static export: output: "export")
npm run dev       # next dev (Turbopack)
npm test          # Playwright e2e (serial, chromium only)

# Backend (from backend/)
uvicorn app.main:app --reload --port 8000
python -m pytest tests/ -v    # 12 decision engine tests, no deps

# Docker (from repo root)
docker compose up --build
```

## Architecture

Backend layers: `app/models/` (SQLAlchemy) → `app/schemas/` (Pydantic) → `app/api/` (FastAPI routes) → `app/services/` (business logic). Four routers: `auth`, `evaluate`, `business`, `transactions`.

Frontend: `src/app/` (App Router pages), `src/components/` (client components), `src/lib/` (auth + utilities). `@/` maps to `./src/`.

## Schema changes

No Alembic. `Base.metadata.create_all` runs on startup in `app/main.py` lifespan. Schema additions that alter existing tables use raw SQL there too (e.g., `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS currency ...`).

## Deployment (Vercel)

Monorepo via `vercel.json`: frontend (root `frontend/`, framework: nextjs), backend (root `backend/`, entrypoint `app.main:app`). Rewrites route `/api/*` to backend, `/*` to frontend.

**Env vars**: `NEXT_PUBLIC_API_URL` → backend URL (frontend, defaults to `http://localhost:8000`), `DATABASE_URL` + `JWT_SECRET` (backend).

## Key gotchas

- **Tailwind CSS v4**: uses `@import "tailwindcss"` + `@theme inline {}` directive in CSS, NOT `@tailwind` or `tailwind.config`.
- **Auth**: localStorage-based (`token`/`user` keys in `src/lib/auth.tsx`). API URL from `NEXT_PUBLIC_API_URL` (empty = same-origin).
- **Lint override**: `react-hooks/set-state-in-effect` disabled for `src/lib/auth.tsx`, `src/hooks/useBusiness.ts`, `src/app/app/transactions/page.tsx` (necessary for localStorage sync).
- **No bank API**: Salt Edge/Plaid removed. Transactions from manual entry + CSV/JSON import only.
- **Transactions**: GET `?page=&per_page=` (paginated, 25 default), POST (single), DELETE `/{id}`, POST `/bulk` (JSON array or CSV). Page at `/app/transactions`.
- **Multi-currency**: All ISO 4217 currencies. Set in settings page. Backend converts all amounts using live Frankfurter API rates on currency change.
- **`fmt(v, currency?)`** in `src/lib/format.ts` — locale-aware currency formatting. Import from there, never inline.
- **`frontend/src/lib/currencies.ts`**: all ISO 4217 codes, `getCurrencySymbol`, `getCurrencyName`, `CURRENCY_OPTIONS`. Uses `Intl` APIs with caching.
- **Decision engine** (`app/services/decision_engine.py`): weekday-pattern wavy projections, 60-day ramp-up revenue, `wait_date` ISO string alongside `wait_days`. 12 standalone tests, no DB/fixtures.
- **CORS**: allows `http://localhost:3000` + `https://` variants from `VERCEL_URL`, `NETLIFY_URL` env vars.
- **Docker**: backend mounts `./backend:/app` for hot reload; frontend runs `npm install` on container start (not build). No `node_modules` mount (anonymous volume).
- **Database pooler**: `app/database.py` replaces `sslmode=require` with `ssl=require` and strips `pgbouncer=true` params for Supabase compatibility.

## Config files

- `.env.example` → copy to `.env` for Docker. Requires `DATABASE_URL`, `JWT_SECRET`.
- `frontend/.env.local` — auto-created with `NEXT_PUBLIC_API_URL=http://localhost:8000` for local dev.
- `.opencode/opencode.json` — OpenCode config (skills path, graphify plugin).
- `frontend/eslint.config.mjs` — ESLint flat config (ignore `.next/`, `out/`, override for 3 files).
- `frontend/playwright.config.ts` — serial, chromium-only, base URL `localhost:3000`.
