import httpx

FRANKFURTER_API = "https://api.frankfurter.app"


async def get_exchange_rate(from_currency: str, to_currency: str) -> float | None:
    if from_currency == to_currency:
        return 1.0

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{FRANKFURTER_API}/latest",
                params={"from": from_currency, "to": to_currency},
            )
            resp.raise_for_status()
            data = resp.json()
            return data["rates"][to_currency]
    except Exception:
        return None
