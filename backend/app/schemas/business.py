from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional


CURRENCIES = ["USD", "EUR", "GBP", "INR", "JPY", "CAD", "AUD", "BRL", "SGD", "AED"]


class BusinessCreate(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=255)
    min_safe_reserve: float = Field(5000.0, ge=0)
    currency: str = Field("USD", pattern="^[A-Z]{3}$")


class BusinessResponse(BaseModel):
    id: UUID
    user_id: UUID
    company_name: str
    min_safe_reserve: float
    monthly_burn_rate: float | None
    current_cash: float = 0.0
    currency: str = "USD"
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BusinessUpdate(BaseModel):
    company_name: Optional[str] = None
    min_safe_reserve: Optional[float] = None
    currency: Optional[str] = None
