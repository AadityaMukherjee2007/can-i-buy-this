# Salt Edge Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Plaid with Salt Edge for bank account aggregation, adding 5,000+ banks across 50+ countries including Indian banks.

**Architecture:** Backend uses `httpx` to call Salt Edge API v5 (create customer → create connect session → fetch connections/accounts/transactions). Frontend opens Salt Edge Connect widget in a popup. Transactions are stored in the existing `transactions` table — the decision engine is unchanged.

**Tech Stack:** Python 3.12, FastAPI, httpx 0.27, Salt Edge API v5, React 19

## Global Constraints

- `httpx==0.27.0` already in `requirements.txt` — no new dependencies
- Salt Edge API base URL: `https://www.saltedge.com/api/v5`
- Auth headers: `App-id` and `Secret`
- No production signing needed for sandbox/test mode
- `NEXT_PUBLIC_API_URL` from `src/lib/format.ts` for frontend API calls
- Settings URL: `http://localhost:3000/settings`

---

### Task 1: Update config and env vars

**Files:**
- Modify: `backend/app/config.py`
- Modify: `.env.example`
- Modify: `docker-compose.yml`
- Modify: `backend/.env`

- [ ] **Step 1: Update `backend/app/config.py`** — replace Plaid settings with Salt Edge settings

```python
class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://cibt_user:cibt_pass@localhost:5432/canibuythis"
    saltedge_app_id: str = ""
    saltedge_secret: str = ""
    saltedge_env: str = "sandbox"
    stripe_secret_key: str = ""
    jwt_secret: str = "super-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24

    class Config:
        env_file = ".env"
```

- [ ] **Step 2: Update `.env.example`**

```
# ═══════════════════════════════════════════════════════════════════════════════
# REQUIRED FOR LIVE BANK CONNECTIONS (Salt Edge)
# ═══════════════════════════════════════════════════════════════════════════════
#
# Get these from https://www.saltedge.com/clients/applications
# Sandbox credentials work without a real bank account.

SALTEDGE_APP_ID=
SALTEDGE_SECRET=
SALTEDGE_ENV=sandbox
```

- [ ] **Step 3: Update `docker-compose.yml`** — replace Plaid env vars with Salt Edge

```yaml
environment:
  DATABASE_URL: ${DATABASE_URL}
  SALTEDGE_APP_ID: ${SALTEDGE_APP_ID}
  SALTEDGE_SECRET: ${SALTEDGE_SECRET}
  SALTEDGE_ENV: sandbox
```

- [ ] **Step 4: Update `backend/.env`** — replace Plaid vars

```
SALTEDGE_APP_ID=
SALTEDGE_SECRET=
SALTEDGE_ENV=sandbox
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/config.py .env.example docker-compose.yml backend/.env
git commit -m "feat: replace Plaid config with Salt Edge config"
```

---

### Task 2: Update Business model — replace Plaid columns with Salt Edge columns

**Files:**
- Modify: `backend/app/models/business.py`
- Modify: `backend/app/schemas/business.py`

- [ ] **Step 1: Update Business model** — replace `plaid_access_token` and `plaid_item_id` with `saltedge_customer_id` and `saltedge_connection_id`

```python
# In backend/app/models/business.py, replace lines 19-20:
    saltedge_customer_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    saltedge_connection_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
```

- [ ] **Step 2: Update Business schema** — update `BusinessResponse` to expose new fields

```python
# In backend/app/schemas/business.py, replace:
    plaid_item_id: str | None = None
    # with:
    saltedge_customer_id: str | None = None
    saltedge_connection_id: str | None = None
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/models/business.py backend/app/schemas/business.py
git commit -m "feat: replace Plaid columns with Salt Edge columns in Business model"
```

---

### Task 2a: Update Transaction model — replace Plaid reference with Salt Edge

**Files:**
- Modify: `backend/app/models/transaction.py`

- [ ] **Step 1: Rename `plaid_transaction_id` to `saltedge_transaction_id`**

```python
# In backend/app/models/transaction.py, line 16:
    saltedge_transaction_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/models/transaction.py
git commit -m "feat: rename plaid_transaction_id to saltedge_transaction_id in Transaction model"
```

---

### Task 3: Create Salt Edge service

**Files:**
- Create: `backend/app/services/saltedge_service.py`

- [ ] **Step 1: Create `backend/app/services/saltedge_service.py`**

```python
import hashlib
import hmac
from typing import Any

import httpx

from app.config import settings

BASE_URL = "https://www.saltedge.com/api/v5"


def _headers() -> dict[str, str]:
    return {
        "Accept": "application/json",
        "Content-type": "application/json",
        "App-id": settings.saltedge_app_id,
        "Secret": settings.saltedge_secret,
    }


async def create_customer(identifier: str) -> dict[str, Any]:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{BASE_URL}/customers",
            headers=_headers(),
            json={"data": {"identifier": identifier}},
        )
        resp.raise_for_status()
        return resp.json()["data"]


async def create_connect_session(
    customer_id: str,
    return_to_url: str,
    from_date: str = "2024-01-01",
) -> dict[str, Any]:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{BASE_URL}/connect_sessions/create",
            headers=_headers(),
            json={
                "data": {
                    "customer_id": customer_id,
                    "consent": {
                        "scopes": ["account_details", "transactions_details"],
                        "from_date": from_date,
                    },
                    "attempt": {
                        "return_to": return_to_url,
                    },
                }
            },
        )
        resp.raise_for_status()
        return resp.json()["data"]


async def get_connections(customer_id: str) -> list[dict[str, Any]]:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{BASE_URL}/connections",
            headers=_headers(),
            params={"customer_id": customer_id},
        )
        resp.raise_for_status()
        return resp.json()["data"]


async def get_accounts(connection_id: str) -> list[dict[str, Any]]:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{BASE_URL}/accounts",
            headers=_headers(),
            params={"connection_id": connection_id},
        )
        resp.raise_for_status()
        return resp.json()["data"]


async def get_transactions(
    connection_id: str,
    account_id: str,
    from_date: str | None = None,
    to_date: str | None = None,
) -> list[dict[str, Any]]:
    params: dict[str, str] = {
        "connection_id": connection_id,
        "account_id": account_id,
    }
    if from_date:
        params["from_date"] = from_date
    if to_date:
        params["to_date"] = to_date

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{BASE_URL}/transactions",
            headers=_headers(),
            params=params,
        )
        resp.raise_for_status()
        return resp.json()["data"]


async def fetch_all_transactions(
    customer_id: str,
    from_date: str = "2024-01-01",
) -> list[dict[str, Any]]:
    connections = await get_connections(customer_id)
    all_transactions: list[dict[str, Any]] = []
    for conn in connections:
        accounts = await get_accounts(conn["id"])
        for acct in accounts:
            txs = await get_transactions(
                conn["id"], acct["id"],
                from_date=from_date,
            )
            all_transactions.extend(txs)
    return all_transactions
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/saltedge_service.py
git commit -m "feat: add Salt Edge API service"
```

---

### Task 4: Create Salt Edge API router

**Files:**
- Create: `backend/app/api/saltedge.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create `backend/app/api/saltedge.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models.user import User
from app.models.business import Business
from app.models.transaction import Transaction
from app.api.deps import get_current_user
from app.services.saltedge_service import (
    create_customer,
    create_connect_session,
    fetch_all_transactions,
)

router = APIRouter(prefix="/api/saltedge", tags=["saltedge"])


class ConnectSessionResponse(BaseModel):
    connect_url: str


@router.get("/session", response_model=ConnectSessionResponse)
async def get_connect_session(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    biz = user.business
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found")

    try:
        if not biz.saltedge_customer_id:
            customer = await create_customer(str(user.id))
            biz.saltedge_customer_id = customer["id"]
            await db.commit()

        return_to = "http://localhost:3000/settings?connection_completed=1"
        session = await create_connect_session(
            biz.saltedge_customer_id,
            return_to_url=return_to,
        )
        return ConnectSessionResponse(connect_url=session["connect_url"])
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Salt Edge error: {str(e)}")


@router.get("/transactions")
async def import_transactions(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    biz = user.business
    if not biz or not biz.saltedge_customer_id or not biz.saltedge_connection_id:
        raise HTTPException(status_code=400, detail="Bank not connected")

    try:
        from sqlalchemy import select

        raw_txs = await fetch_all_transactions(biz.saltedge_customer_id)
        imported = 0
        for raw in raw_txs:
            se_id = str(raw["id"])
            existing = await db.execute(
                select(Transaction).where(Transaction.saltedge_transaction_id == se_id)
            )
            if existing.scalar_one_or_none():
                continue
            tx = Transaction(
                business_id=biz.id,
                saltedge_transaction_id=se_id,
                amount=raw["amount"],
                date=raw["made_on"],
                description=raw.get("description", ""),
                category=raw.get("category"),
                is_inflow=raw["amount"] > 0,
            )
            db.add(tx)
            imported += 1
        await db.commit()
        return {"imported": imported}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Import error: {str(e)}")


@router.post("/store-connection")
async def store_connection(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    biz = user.business
    if not biz or not biz.saltedge_customer_id:
        raise HTTPException(status_code=400, detail="No Salt Edge customer")

    from app.services.saltedge_service import get_connections
    connections = await get_connections(biz.saltedge_customer_id)
    if not connections:
        raise HTTPException(status_code=404, detail="No connections found")

    biz.saltedge_connection_id = connections[0]["id"]
    await db.commit()
    return {"connection_id": biz.saltedge_connection_id}
```

- [ ] **Step 2: Register router in `backend/app/main.py`**

```python
# Add alongside existing routers:
from app.api import saltedge
app.include_router(saltedge.router)
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/saltedge.py backend/app/main.py
git commit -m "feat: add Salt Edge API router"
```

---

### Task 5: Remove Plaid code

**Files:**
- Delete: `backend/app/services/plaid_service.py`
- Delete: `backend/app/api/plaid.py`
- Modify: `backend/app/main.py` — remove Plaid router import
- Modify: `backend/app/models/business.py` — remove Plaid column references (done in Task 2)

- [ ] **Step 1: Delete Plaid files and remove Plaid router from main.py**

```python
# In backend/app/main.py, remove these lines:
from app.api import plaid  # remove this
app.include_router(plaid.router)  # remove this
```

- [ ] **Step 2: Delete the files**

```bash
rm backend/app/services/plaid_service.py
rm backend/app/api/plaid.py
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/main.py
git rm backend/app/services/plaid_service.py backend/app/api/plaid.py
git commit -m "feat: remove Plaid code"
```

---

### Task 6: Replace frontend PlaidLinkButton with SaltEdgeConnectButton

**Files:**
- Create: `frontend/src/components/SaltEdgeConnectButton.tsx`
- Delete: `frontend/src/components/PlaidLinkButton.tsx`
- Modify: `frontend/src/app/settings/page.tsx`

- [ ] **Step 1: Create `frontend/src/components/SaltEdgeConnectButton.tsx`**

```tsx
"use client";

import { useState, useCallback } from "react";
import { Loader2, Building2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { API } from "@/lib/format";

interface Props {
  onSuccess?: () => void;
}

export default function SaltEdgeConnectButton({ onSuccess }: Props) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API}/api/saltedge/session`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to get connect session");
      const { connect_url } = await res.json();

      const popup = window.open(connect_url, "saltedge-connect", "width=800,height=700");
      if (!popup) {
        setError("Pop-up blocked. Please allow pop-ups for this site.");
        return;
      }

      const poll = setInterval(async () => {
        if (popup.closed) {
          clearInterval(poll);
          try {
            const storeRes = await fetch(`${API}/api/saltedge/store-connection`, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
            });
            if (storeRes.ok) {
              await fetch(`${API}/api/saltedge/transactions`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              onSuccess?.();
            }
          } catch {
            setError("Failed to store connection");
          }
          setLoading(false);
        }
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
      setLoading(false);
    }
  }, [token, onSuccess]);

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <Building2 className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleConnect}
        disabled={loading}
        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Connecting...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Building2 className="h-4 w-4" />
            Connect bank account
          </span>
        )}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Update `frontend/src/app/settings/page.tsx`** — replace `PlaidLinkButton` import and usage with `SaltEdgeConnectButton`

- [ ] **Step 3: Delete old Plaid button**

```bash
rm frontend/src/components/PlaidLinkButton.tsx
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/SaltEdgeConnectButton.tsx frontend/src/app/settings/page.tsx
git rm frontend/src/components/PlaidLinkButton.tsx
git commit -m "feat: replace PlaidLinkButton with SaltEdgeConnectButton"
```

---

### Task 7: Update business API to expose Salt Edge connection status

**Files:**
- Modify: `backend/app/api/business.py`
- Modify: `backend/app/schemas/business.py`

- [ ] **Step 1: Update `backend/app/api/business.py`** — the existing `GET /api/business/me` already returns the business object which now has `saltedge_customer_id` and `saltedge_connection_id` — no changes needed if using the schema from Task 2.

- [ ] **Step 2: Verify `backend/app/schemas/business.py` has the new fields**

```python
class BusinessResponse(BaseModel):
    id: str
    company_name: str
    min_safe_reserve: float
    saltedge_customer_id: str | None = None
    saltedge_connection_id: str | None = None
    created_at: datetime
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/business.py backend/app/schemas/business.py
git commit -m "feat: expose Salt Edge connection status in business API"
```

---

### Task 8: Update docker-compose and verify end-to-end

**Files:**
- Modify: `docker-compose.yml` (already done in Task 1)
- Test: manual verification

- [ ] **Step 1: Rebuild and restart**

```bash
docker compose down && docker compose up --build -d
```

- [ ] **Step 2: Verify backend starts cleanly**

```bash
docker compose logs backend --tail 10
# Expected: "Application startup complete"
```

- [ ] **Step 3: Verify settings page loads at http://localhost:3000/settings**

- [ ] **Step 4: Commit any final fixes**

```bash
git add -A && git commit -m "fix: final adjustments for Salt Edge migration"
```
