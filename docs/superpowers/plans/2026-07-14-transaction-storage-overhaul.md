# Transaction Storage Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace bare-bones transaction storage with proper accounting-grade schema, server-side filtering, and flexible categorization.

**Architecture:** Add `type`/`notes`/`status`/`tags` columns to Transaction model; add server-side search + filter query params to GET endpoint; update frontend with proper filters and tag display.

**Tech Stack:** Python 3.12 / FastAPI / SQLAlchemy async / asyncpg — React 19 / Next.js 16 / Tailwind CSS v4

## Global Constraints

- Backend: `app/models/transactions.py`, `app/schemas/transaction.py`, `app/api/transactions.py`
- Frontend: `frontend/src/app/app/transactions/page.tsx`
- No Alembic: use raw `ALTER TABLE` in `app/main.py` lifespan for new columns
- `output: "export"` — no rewrites, static export

---

### Task 1: Backend schema — add columns to Transaction model

**Files:**
- Modify: `backend/app/models/transaction.py` (add fields)
- Modify: `backend/app/schemas/transaction.py` (add to Pydantic)
- Modify: `backend/app/main.py` (ALTER TABLE migration)
- Modify: `backend/app/api/business.py` (update cash calc to use type)
- Test: `backend/tests/` (existing tests should still pass)

**Interfaces:**
- Consumes: existing `Transaction` model
- Produces: `Transaction` with new fields; `TransactionCreate`/`TransactionResponse` with new fields

- [ ] **Step 1: Add columns to Transaction model**

```python
# backend/app/models/transaction.py — new fields
    type: Mapped[str | None] = mapped_column(String(20), nullable=True)          # "expense","income","transfer"
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    payment_method: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="cleared")           # "pending","cleared","reconciled"
    tags: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
```

Also add `from sqlalchemy import Text, ARRAY` import.

- [ ] **Step 2: Update Pydantic schemas**

```python
# backend/app/schemas/transaction.py
class TransactionResponse(BaseModel):
    id: UUID
    business_id: UUID
    amount: float
    date: date
    description: str | None
    category: str | None
    is_inflow: bool | None
    type: str | None = None
    notes: str | None = None
    payment_method: str | None = None
    status: str = "cleared"
    tags: list[str] | None = None

class TransactionCreate(BaseModel):
    amount: float
    date: date
    description: str = Field("", max_length=500)
    category: str | None = None
    is_inflow: bool | None = None
    type: str | None = None  # "expense","income","transfer" — auto-derived from amount if omitted
    notes: str | None = None
    payment_method: str | None = None
    status: str = "cleared"
    tags: list[str] | None = None
```

- [ ] **Step 3: Add ALTER TABLE migration in lifespan**

In `backend/app/main.py`, after existing ALTER TABLE:

```python
await conn.execute(sa.text("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS type VARCHAR(20)"))
await conn.execute(sa.text("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS notes TEXT"))
await conn.execute(sa.text("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_method VARCHAR(100)"))
await conn.execute(sa.text("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'cleared'"))
await conn.execute(sa.text("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tags TEXT[]"))
```

- [ ] **Step 4: Update create_transaction to derive type from amount**

In `backend/app/api/transactions.py`, in `create_transaction`:

```python
    txn_type = payload.type or ("income" if payload.amount > 0 else "expense")
    tx = Transaction(
        business_id=user.business.id,
        amount=payload.amount,
        date=payload.date,
        description=payload.description,
        category=payload.category,
        is_inflow=payload.is_inflow if payload.is_inflow is not None else payload.amount > 0,
        type=txn_type,
        notes=payload.notes,
        payment_method=payload.payment_method,
        status=payload.status,
        tags=payload.tags,
    )
```

Same in `bulk_create_transactions`.

- [ ] **Step 5: Run backend tests**

`python -m pytest tests/ -v` — all 12 should pass.

---

### Task 2: Server-side search + filtering on GET /api/transactions

**Files:**
- Modify: `backend/app/api/transactions.py` (add query params)
- Test: manual with curl

**Interfaces:**
- Consumes: existing GET endpoint
- Produces: filtered/paginated results

- [ ] **Step 1: Add query params to list_transactions**

```python
@router.get("", response_model=PaginatedTransactions)
async def list_transactions(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    search: str | None = Query(None),
    type: str | None = Query(None),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    category: str | None = Query(None),
    status: str | None = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    from sqlalchemy import or_
    base = select(Transaction).where(Transaction.business_id == user.business.id)

    if search:
        base = base.where(
            or_(
                Transaction.description.ilike(f"%{search}%"),
                Transaction.category.ilike(f"%{search}%"),
                Transaction.notes.ilike(f"%{search}%"),
            )
        )
    if type:
        base = base.where(Transaction.type == type)
    if date_from:
        base = base.where(Transaction.date >= date_from)
    if date_to:
        base = base.where(Transaction.date <= date_to)
    if category:
        base = base.where(Transaction.category == category)
    if status:
        base = base.where(Transaction.status == status)

    # rest of the function same
```

- [ ] **Step 2: Test with curl**

```bash
# Login first, get token
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"12345678"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
# Search
curl -s "http://localhost:8000/api/transactions?search=travel&page=1&per_page=5" -H "Authorization: Bearer $TOKEN"
# Filter by type
curl -s "http://localhost:8000/api/transactions?type=expense&page=1&per_page=5" -H "Authorization: Bearer $TOKEN"
```

---

### Task 3: Frontend — server-side search, filters, new field display

**Files:**
- Modify: `frontend/src/app/app/transactions/page.tsx`

- [ ] **Step 1: Replace client-side search with server-side search bar**

Use a debounced search that triggers `fetchTx(1)` with the search term. Remove `filtered`/`sorted` client-side logic.

- [ ] **Step 2: Add filter controls (type dropdown, date range)**

Above the table, add:
- Type filter: All / Income / Expense
- Date range: from / to inputs

- [ ] **Step 3: Show tags as badges in table rows**

After description column, add a tags cell showing colored badges.

- [ ] **Step 4: Update add form with new fields**

Add: Type select, Notes textarea, Payment method, Tags input.

---

### Task 4: Update business API cash calculation

**Files:**
- Modify: `backend/app/api/business.py`

- [ ] **Step 1: Update cash sum to use type instead of is_inflow**

```python
# Instead of using is_inflow, use type field
inflow = await db.execute(
    select(func.coalesce(func.sum(Transaction.amount), 0))
    .where(Transaction.business_id == biz.id, Transaction.type == "income")
)
expense = await db.execute(
    select(func.coalesce(func.sum(Transaction.amount), 0))
    .where(Transaction.business_id == biz.id, Transaction.type == "expense")
)
cash = inflow.scalar() - abs(expense.scalar())
```

(falls back to old is_inflow logic if type is null for legacy data)
