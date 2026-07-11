import hashlib
import hmac
from typing import Any

import httpx

from app.config import settings

BASE_URL = "https://www.saltedge.com/api/v6"


def _headers() -> dict[str, str]:
    return {
        "Accept": "application/json",
        "Content-type": "application/json",
        "App-id": settings.saltedge_app_id,
        "Secret": settings.saltedge_secret,
    }


async def create_customer(identifier: str) -> dict[str, Any]:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{BASE_URL}/customers",
            headers=_headers(),
            json={"data": {"identifier": identifier}},
        )
        resp.raise_for_status()
        return resp.json()["data"]


async def create_connect_session(
    customer_id: str,
    return_to_url: str,
    from_date: str = "2024-07-01",
    provider_code: str | None = None,
) -> dict[str, Any]:
    body: dict[str, Any] = {
        "data": {
            "customer_id": customer_id,
            "consent": {
                "scopes": ["accounts", "transactions"],
                "from_date": from_date,
            },
            "attempt": {
                "return_to": return_to_url,
            },
        }
    }
    if provider_code:
        body["data"]["provider"] = {"code": provider_code}

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{BASE_URL}/connections/connect",
            headers=_headers(),
            json=body,
        )
        resp.raise_for_status()
        return resp.json()["data"]


async def get_connections(customer_id: str) -> list[dict[str, Any]]:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{BASE_URL}/connections",
            headers=_headers(),
            params={"customer_id": customer_id},
        )
        resp.raise_for_status()
        return resp.json()["data"]


async def get_accounts(connection_id: str) -> list[dict[str, Any]]:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{BASE_URL}/accounts",
            headers=_headers(),
            params={"connection_id": connection_id},
        )
        resp.raise_for_status()
        return resp.json()["data"]


async def get_transactions(
    connection_id: str,
    account_id: str,
    from_date: str | None = None,
    to_date: str | None = None,
) -> list[dict[str, Any]]:
    params: dict[str, str] = {
        "connection_id": connection_id,
        "account_id": account_id,
    }
    if from_date:
        params["from_date"] = from_date
    if to_date:
        params["to_date"] = to_date

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{BASE_URL}/transactions",
            headers=_headers(),
            params=params,
        )
        resp.raise_for_status()
        return resp.json()["data"]


async def fetch_all_transactions(
    customer_id: str,
    from_date: str = "2024-07-01",
) -> list[dict[str, Any]]:
    connections = await get_connections(customer_id)
    all_transactions: list[dict[str, Any]] = []
    for conn in connections:
        accounts = await get_accounts(conn["id"])
        for acct in accounts:
            txs = await get_transactions(
                conn["id"], acct["id"],
                from_date=from_date,
            )
            all_transactions.extend(txs)
    return all_transactions
