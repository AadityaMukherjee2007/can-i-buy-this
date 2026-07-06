from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models.user import User
from app.api.deps import get_current_user
from app.services.plaid_service import create_link_token, exchange_public_token

router = APIRouter(prefix="/api/plaid", tags=["plaid"])


class LinkTokenResponse(BaseModel):
    link_token: str


class PublicTokenRequest(BaseModel):
    public_token: str


@router.get("/create_link_token", response_model=LinkTokenResponse)
async def get_link_token(user: User = Depends(get_current_user)):
    token = await create_link_token(str(user.id))
    return LinkTokenResponse(link_token=token)


@router.post("/exchange_token")
async def exchange_token(
    payload: PublicTokenRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    access_token, item_id = await exchange_public_token(payload.public_token)
    biz = user.business
    biz.plaid_access_token = access_token
    biz.plaid_item_id = item_id
    await db.commit()
    return {"status": "success", "item_id": item_id}
