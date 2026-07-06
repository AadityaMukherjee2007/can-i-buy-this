from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_session
from app.models.user import User
from app.models.transaction import Transaction
from app.api.deps import get_current_user
from app.schemas.transaction import TransactionResponse

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


@router.get("", response_model=list[TransactionResponse])
async def list_transactions(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Transaction)
        .where(Transaction.business_id == user.business.id)
        .order_by(desc(Transaction.date))
        .offset(offset)
        .limit(limit)
    )
    return [TransactionResponse.model_validate(t) for t in result.scalars().all()]
