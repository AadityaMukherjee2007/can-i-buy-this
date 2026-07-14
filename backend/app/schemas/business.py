from pydantic import BaseModel, Field, field_validator
from uuid import UUID
from datetime import datetime
from typing import Optional


CURRENCIES = [
    "AED","AFN","ALL","AMD","ANG","AOA","ARS","AUD","AWG","AZN",
    "BAM","BBD","BDT","BGN","BHD","BIF","BMD","BND","BOB","BRL",
    "BSD","BTN","BWP","BYN","BZD",
    "CAD","CDF","CHF","CLF","CLP","CNY","COP","CRC","CUC","CUP",
    "CVE","CZK",
    "DJF","DKK","DOP","DZD",
    "EGP","ERN","ETB","EUR",
    "FJD","FKP",
    "GBP","GEL","GHS","GIP","GMD","GNF","GTQ","GYD",
    "HKD","HNL","HRK","HTG","HUF",
    "IDR","ILS","INR","IQD","IRR","ISK",
    "JMD","JOD","JPY",
    "KES","KGS","KHR","KMF","KPW","KRW","KWD","KYD","KZT",
    "LAK","LBP","LKR","LRD","LSL","LYD",
    "MAD","MDL","MGA","MKD","MMK","MNT","MOP","MRU","MUR",
    "MVR","MWK","MXN","MYR","MZN",
    "NAD","NGN","NIO","NOK","NPR","NZD",
    "OMR",
    "PAB","PEN","PGK","PHP","PKR","PLN","PYG",
    "QAR",
    "RON","RSD","RUB","RWF",
    "SAR","SBD","SCR","SDG","SEK","SGD","SHP","SLE","SLL",
    "SOS","SRD","SSP","STN","SVC","SYP","SZL",
    "THB","TJS","TMT","TND","TOP","TRY","TTD","TWD","TZS",
    "UAH","UGX","USD","UYU","UZS",
    "VED","VES","VND","VUV",
    "WST",
    "XAF","XCD","XDR","XOF","XPF",
    "YER",
    "ZAR","ZMW","ZWL",
]


def validate_currency(v: str) -> str:
    if v not in CURRENCIES:
        raise ValueError(f"Unknown currency: {v}")
    return v


class BusinessCreate(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=255)
    min_safe_reserve: float = Field(5000.0, ge=0)
    currency: str = "USD"

    _validate_currency = field_validator("currency")(validate_currency)


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

    _validate_currency = field_validator("currency")(validate_currency)
