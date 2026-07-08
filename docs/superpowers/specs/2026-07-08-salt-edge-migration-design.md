# Salt Edge Migration — Design Doc

## Goal

Replace Plaid with Salt Edge for bank account aggregation, adding support for Indian banks (ICICI, HDFC, SBI) and 5,000+ institutions across 50+ countries.

## Architecture

### Flow

```
Frontend (React)                    Backend (FastAPI)               Salt Edge API
─────────────────                   ────────────────               ────────────
  Click "Connect bank" ──→  POST /api/saltedge/session ──→  POST /api/v5/connect_sessions/create
                                                              (creates customer if new, returns connect_url)
  Open iframe/popup ────  ←── { connect_url } ────────── 
  to connect_url ─────────────────────────────────────────────────── Salt Edge Connect widget
  User selects bank, auths
  Widget redirects to return_to ──→  Success page
                                      GET /api/saltedge/connections ──→  GET /api/v5/connections
                                      GET /api/saltedge/accounts ──→  GET /api/v5/accounts
                                      GET /api/saltedge/transactions ──→  GET /api/v5/transactions
                                      Store in transactions table
```

### Data model changes

- **Business model**: replace `plaid_access_token` / `plaid_item_id` with `saltedge_customer_id` / `saltedge_connection_id`
- Drop Plaid-related columns (nullable, keep for backward compat or clean up)

### Backend changes

1. **`app/config.py`**: replace `plaid_*` with `saltedge_app_id` / `saltedge_secret`
2. **`app/services/saltedge_service.py`**: HTTP client for Salt Edge API v5 (create customer, create connect session, fetch connections, accounts, transactions)
3. **`app/api/saltedge.py`**: endpoints — `GET /api/saltedge/session`, `GET /api/saltedge/connections`, `GET /api/saltedge/transactions`
4. **Remove** `app/services/plaid_service.py`, `app/api/plaid.py`, `app/api/plaid.py`
5. **Update** `app/api/business.py` to expose saltedge connection status

### Frontend changes

1. **`src/components/SaltEdgeConnectButton.tsx`**: new component that calls `GET /api/saltedge/session`, opens the connect URL in a popup/iframe, polls for connection completion
2. **Remove** `src/components/PlaidLinkButton.tsx`
3. **Update** `src/app/settings/page.tsx` to use new component

### Env vars (`.env.example`)

```
SALTEDGE_APP_ID=...
SALTEDGE_SECRET=...
SALTEDGE_ENV=sandbox  # sandbox | live
```

Remove `PLAID_*` vars.

### Decision engine

No changes needed — it reads from the `transactions` table, which Salt Edge will populate. The dummy data fallback (when transactions table is empty) remains.

### Testing

- Update `backend/tests/` — mock Salt Edge API responses
- No new test dependencies (use `httpx` with `resp` or `pytest-httpx`)
