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
            biz.saltedge_customer_id = customer["customer_id"]
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
