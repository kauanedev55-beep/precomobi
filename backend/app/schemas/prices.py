from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas.mvp import ProductRead


class PriceReportCreate(BaseModel):
    product_id: int
    market_id: int
    price: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    observed_at: datetime | None = None
    notes: str | None = Field(default=None, max_length=500)


class PriceReportRead(BaseModel):
    id: int
    product_id: int
    product_name: str
    market_id: int
    market_name: str
    price: Decimal
    reported_at: datetime
    source_type: str
    notes: str | None
    confirmations_count: int = 0
    confirmed_by_me: bool = False
    is_mine: bool = False


class PriceConfirmationCreate(BaseModel):
    observed_price: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)


class ProductPriceRead(BaseModel):
    """Preço mais recente de um produto em um mercado (price = None quando não há registro)."""

    report_id: int | None = None
    market_id: int
    market_name: str
    price: Decimal | None
    reported_at: datetime | None
    source_type: str | None
    confirmations_count: int = 0
    confirmed_by_me: bool = False
    is_mine: bool = False


class ProductDetailRead(ProductRead):
    prices: list[ProductPriceRead]
