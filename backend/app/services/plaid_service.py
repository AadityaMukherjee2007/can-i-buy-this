import asyncio
from typing import Any

import plaid
from plaid.api import plaid_api
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.transactions_sync_request import TransactionsSyncRequest

from app.config import settings

configuration = plaid.Configuration(
    host=plaid.Environment.Sandbox if settings.plaid_env == "sandbox" else plaid.Environment.Production,
    api_key={
        "clientId": settings.plaid_client_id,
        "secret": settings.plaid_secret,
    },
)
api_client = plaid.ApiClient(configuration)
client = plaid_api.PlaidApi(api_client)


async def create_link_token(user_id: str) -> dict[str, Any]:
    request = LinkTokenCreateRequest(
        user=LinkTokenCreateRequestUser(client_user_id=user_id),
        client_name="Can I Buy This",
        products=[Products("transactions")],
        country_codes=[CountryCode(c) for c in ["US", "CA", "GB", "IE", "FR", "ES", "NL", "DE", "IT", "PT", "DK", "NO", "SE", "EE", "LV", "LT", "PL", "BE"]],
        language="en",
    )
    response = await asyncio.to_thread(client.link_token_create, request)
    return response.to_dict()


async def exchange_public_token(public_token: str) -> dict[str, Any]:
    request = ItemPublicTokenExchangeRequest(public_token=public_token)
    response = await asyncio.to_thread(client.item_public_token_exchange, request)
    return response.to_dict()


async def sync_transactions(access_token: str, cursor: str | None = None) -> dict[str, Any]:
    request = TransactionsSyncRequest(access_token=access_token, cursor=cursor)
    response = await asyncio.to_thread(client.transactions_sync, request)
    return response.to_dict()
