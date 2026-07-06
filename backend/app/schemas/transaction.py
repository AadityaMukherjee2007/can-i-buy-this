from pydantic import BaseModel
from uuid import UUID
from datetime import date


class TransactionResponse(BaseModel):
    id: UUID
    business_id: UUID
    amount: float
    date: date
    description: str | None
    category: str | None
    is_inflow: bool | None

    class Config:
        from_attributes = True
