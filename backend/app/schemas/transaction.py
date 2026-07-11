from pydantic import BaseModel, Field
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


class TransactionCreate(BaseModel):
    amount: float = Field(..., description="Positive for inflow, negative for outflow")
    date: date
    description: str = Field("", max_length=500)
    category: str | None = None
    is_inflow: bool | None = None


class BulkTransactionCreate(BaseModel):
    transactions: list[TransactionCreate]
