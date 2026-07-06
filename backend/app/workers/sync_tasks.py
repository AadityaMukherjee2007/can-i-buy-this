from datetime import datetime

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.business import Business
from app.models.transaction import Transaction
from app.services.plaid_service import sync_transactions
from app.workers.celery_app import celery_app

sync_engine = create_engine(
    settings.database_url.replace("+asyncpg", ""),
    pool_size=5,
    max_overflow=5,
)


@celery_app.task(bind=True, max_retries=3, soft_time_limit=300)
def sync_bank_transactions(self, business_id: str):
    db = Session(sync_engine)
    try:
        biz = db.execute(select(Business).where(Business.id == business_id)).scalar_one_or_none()
        if not biz or not biz.plaid_access_token:
            return {"error": "No Plaid token found"}

        cursor = None
        has_more = True
        total_added = 0

        while has_more:
            result = sync_transactions(biz.plaid_access_token, cursor)
            for txn in result["added"]:
                existing = db.execute(
                    select(Transaction).where(Transaction.plaid_transaction_id == txn["transaction_id"])
                ).scalar_one_or_none()
                if not existing:
                    amount = float(txn.get("amount", 0))
                    db.add(Transaction(
                        business_id=biz.id,
                        plaid_transaction_id=txn["transaction_id"],
                        amount=amount,
                        date=datetime.strptime(txn["date"], "%Y-%m-%d").date(),
                        description=txn.get("name", ""),
                        category=txn.get("category", [None])[0] if txn.get("category") else None,
                        is_inflow=amount > 0,
                    ))
                    total_added += 1

            cursor = result["next_cursor"]
            has_more = result["has_more"]

        db.commit()
        return {"synced": total_added, "business_id": business_id}

    except Exception as exc:
        db.rollback()
        raise self.retry(exc=exc, countdown=60)

    finally:
        db.close()
