from uuid import uuid4

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models.user import User
from app.models.transaction import Transaction
from app.models.scenario import Scenario
from app.schemas.scenario import EvaluateRequest, EvaluateResponse
from app.api.deps import get_current_user
from app.services.decision_engine import evaluate_purchase

router = APIRouter(prefix="/api/evaluate", tags=["evaluate"])


async def _seed_transactions(db: AsyncSession, business_id: str) -> list[Transaction]:
    from datetime import datetime, timedelta
    import random
    random.seed(42)

    today = datetime.utcnow().date()
    seeded: list[Transaction] = []
    for i in range(22):
        dt = today - timedelta(days=i * 3 + 2)
        amt = round(random.uniform(500, 8000), 2)
        seeded.append(Transaction(
            business_id=business_id,
            amount=amt, date=dt,
            description=f"Invoice payment — {random.choice(['Client A', 'Client B', 'Consulting', 'Freelance', 'Retainer'])}",
            category="income", is_inflow=True, type="income",
        ))
    for i in range(50):
        dt = today - timedelta(days=i + 1)
        amount = -round(random.uniform(50, 2500), 2)
        seeded.append(Transaction(
            business_id=business_id,
            amount=amount, date=dt,
            description=random.choice([
                "Office supplies", "Software subscription", "Utilities",
                "Contractor payment", "Marketing", "Rent", "Insurance", "Travel"
            ]),
            category="expense", is_inflow=False, type="expense",
        ))
    db.add_all(seeded)
    await db.commit()
    return seeded


@router.post("", response_model=EvaluateResponse)
async def evaluate(
    payload: EvaluateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    biz = user.business
    current_cash = 0.0
    historical_inflows: list[float] = []
    historical_outflows: list[float] = []

    result = await db.execute(
        select(Transaction).where(Transaction.business_id == biz.id)
        .order_by(Transaction.date.desc())
        .limit(500)
    )
    transactions = result.scalars().all()

    if not transactions:
        transactions = await _seed_transactions(db, biz.id)
        data_source = "seeded"
    else:
        data_source = "real"

    for txn in transactions:
        if txn.amount >= 0:
            historical_inflows.append(txn.amount)
        else:
            historical_outflows.append(abs(txn.amount))
        if txn.amount > 0:
            current_cash += txn.amount
        else:
            current_cash -= abs(txn.amount)

    decision = evaluate_purchase(
        current_cash=float(current_cash),
        min_reserve=biz.min_safe_reserve,
        historical_inflows=historical_inflows,
        historical_outflows=historical_outflows,
        purchase_cost=payload.purchase_cost,
        recurring_cost=payload.recurring_cost,
        expected_revenue=payload.expected_revenue,
        payment_delay_days=payload.payment_delay_days,
    )

    scenario = Scenario(
        user_id=user.id,
        purchase_name=payload.purchase_name,
        purchase_cost=payload.purchase_cost,
        recurring_cost=payload.recurring_cost,
        expected_revenue=payload.expected_revenue,
        payment_delay_days=payload.payment_delay_days,
        data_source=data_source,
        decision=decision["decision"],
        wait_days=decision.get("wait_days"),
        reason=decision.get("reason"),
        chart_data={"trajectory": decision["chart_data"]},
    )
    db.add(scenario)
    await db.commit()
    await db.refresh(scenario)

    return EvaluateResponse(
        decision=decision["decision"],
        reason=decision["reason"],
        wait_days=decision.get("wait_days"),
        wait_date=decision.get("wait_date"),
        chart_data=decision["chart_data"],
        current_cash=float(current_cash),
        without_purchase_trajectory=decision["without_purchase_trajectory"],
        scenario_id=scenario.id,
        data_source=data_source,
        purchase_cost=payload.purchase_cost,
        expected_revenue=payload.expected_revenue,
        payment_delay_days=payload.payment_delay_days,
    )
