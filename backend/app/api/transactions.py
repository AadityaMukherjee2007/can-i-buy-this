from datetime import date, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models.user import User
from app.models.transaction import Transaction
from app.api.deps import get_current_user
from app.schemas.transaction import TransactionResponse, TransactionCreate, BulkTransactionCreate, PaginatedTransactions
from sqlalchemy import func

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


@router.get("", response_model=PaginatedTransactions)
async def list_transactions(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    base = select(Transaction).where(Transaction.business_id == user.business.id)
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
    is_inflow = payload.is_inflow if payload.is_inflow is not None else payload.amount > 0
    tx = Transaction(
        business_id=user.business.id,
        amount=payload.amount,
        date=payload.date,
        description=payload.description,
        category=payload.category,
        is_inflow=is_inflow,
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
        is_inflow = t.is_inflow if t.is_inflow is not None else t.amount > 0
        transactions.append(Transaction(
            business_id=user.business.id,
            amount=t.amount,
            date=t.date,
            description=t.description,
            category=t.category,
            is_inflow=is_inflow,
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
