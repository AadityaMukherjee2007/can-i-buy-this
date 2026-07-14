from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models.user import User
from app.models.transaction import Transaction
from app.schemas.business import BusinessResponse, BusinessUpdate
from app.api.deps import get_current_user
from app.services.currency_service import get_exchange_rate

router = APIRouter(prefix="/api/business", tags=["business"])


@router.get("/me", response_model=BusinessResponse)
async def get_my_business(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    biz = user.business
    result = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0))
        .where(Transaction.business_id == biz.id)
    )
    cash = result.scalar()
    resp = BusinessResponse.model_validate(biz)
    resp.current_cash = round(float(cash), 2)
    return resp


@router.put("/me", response_model=BusinessResponse)
async def update_my_business(
    payload: BusinessUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    biz = user.business
    old_currency = biz.currency

    if payload.company_name is not None:
        biz.company_name = payload.company_name
    if payload.min_safe_reserve is not None:
        biz.min_safe_reserve = payload.min_safe_reserve
    if payload.currency is not None and payload.currency != old_currency:
        rate = await get_exchange_rate(old_currency, payload.currency)
        if rate is not None:
            result = await db.execute(
                select(Transaction).where(Transaction.business_id == biz.id)
            )
            transactions = result.scalars().all()
            for txn in transactions:
                txn.amount = round(txn.amount * rate, 2)
            biz.min_safe_reserve = round(biz.min_safe_reserve * rate, 2)
        biz.currency = payload.currency
    await db.commit()
    await db.refresh(biz)
    return BusinessResponse.model_validate(biz)
