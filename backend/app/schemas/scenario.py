from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID


class EvaluateRequest(BaseModel):
    purchase_name: str = Field(..., min_length=1, max_length=255)
    purchase_cost: float = Field(..., gt=0)
    recurring_cost: float = Field(0, ge=0)
    expected_revenue: float = Field(0, ge=0, description="Monthly revenue this purchase is expected to generate")
    payment_delay_days: int = Field(0, ge=0, le=90, description="Days until payment is due (e.g. Net-30)")


class EvaluateResponse(BaseModel):
    decision: str
    reason: str
    wait_days: Optional[int] = None
    wait_date: Optional[str] = None
    chart_data: list[float]
    current_cash: float
    without_purchase_trajectory: list[float]
    scenario_id: Optional[UUID] = None
    data_source: str = "real"
    purchase_cost: float = 0
    expected_revenue: float = 0
    payment_delay_days: int = 0
