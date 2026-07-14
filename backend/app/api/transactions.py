from datetime import date, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select, desc, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models.user import User
from app.models.transaction import Transaction
from app.api.deps import get_current_user
from app.schemas.transaction import TransactionResponse, TransactionCreate, BulkTransactionCreate, PaginatedTransactions

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


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

    total_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total = total_result.scalar() or 0
    result = await db.execute(
        base.order_by(desc(Transaction.date))
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    items = [TransactionResponse.model_validate(t) for t in result.scalars().all()]
    return PaginatedTransactions(items=items, total=total, page=page, per_page=per_page)


@router.post("", response_model=TransactionResponse, status_code=201)
async def create_transaction(
    payload: TransactionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    txn_type = payload.type or ("income" if payload.amount > 0 else "expense")
    is_inflow = payload.is_inflow if payload.is_inflow is not None else txn_type == "income"
    tx = Transaction(
        business_id=user.business.id,
        amount=payload.amount,
        date=payload.date,
        description=payload.description,
        category=payload.category,
        is_inflow=is_inflow,
        type=txn_type,
        notes=payload.notes,
        payment_method=payload.payment_method,
        status=payload.status,
        tags=payload.tags,
    )
    db.add(tx)
    await db.commit()
    await db.refresh(tx)
    return TransactionResponse.model_validate(tx)


@router.post("/bulk", status_code=201)
async def bulk_create_transactions(
    payload: BulkTransactionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    transactions = []
    for t in payload.transactions:
        txn_type = t.type or ("income" if t.amount > 0 else "expense")
        is_inflow = t.is_inflow if t.is_inflow is not None else txn_type == "income"
        transactions.append(Transaction(
            business_id=user.business.id,
            amount=t.amount,
            date=t.date,
            description=t.description,
            category=t.category,
            is_inflow=is_inflow,
            type=txn_type,
            notes=t.notes,
            payment_method=t.payment_method,
            status=t.status,
            tags=t.tags,
        ))
    db.add_all(transactions)
    await db.commit()
    return {"imported": len(transactions)}


@router.delete("/{tx_id}", status_code=204)
async def delete_transaction(
    tx_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == tx_id,
            Transaction.business_id == user.business.id,
        )
    )
    tx = result.scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    await db.delete(tx)
    await db.commit()
