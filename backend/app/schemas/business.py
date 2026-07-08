from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional


class BusinessCreate(BaseModel):
    company_name: str
    min_safe_reserve: float = Field(5000.0, ge=0)


class BusinessUpdate(BaseModel):
    company_name: Optional[str] = None
    min_safe_reserve: Optional[float] = Field(None, ge=0)


class BusinessResponse(BaseModel):
    id: UUID
    user_id: UUID
    company_name: str
    min_safe_reserve: float
    monthly_burn_rate: Optional[float] = None
    saltedge_customer_id: Optional[str] = None
    saltedge_connection_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
