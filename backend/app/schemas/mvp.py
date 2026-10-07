from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ProductRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ean: str | None
    name: str
    brand: str | None
    category: str | None
    quantity_value: Decimal | None
    quantity_unit: str | None
    image_url: str | None = None
    min_price: Decimal | None = None
    min_price_market: str | None = None


class MarketRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    address: str
    neighborhood: str | None
    city: str
    state: str
    latitude: Decimal | None
    longitude: Decimal | None


class ShoppingListItemCreate(BaseModel):
    product_id: int
    quantity: Decimal = Field(default=1, gt=0)


class ShoppingListCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    items: list[ShoppingListItemCreate] = Field(default_factory=list)


class ShoppingListItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    quantity: Decimal
    is_purchased: bool
    product: ProductRead


class ShoppingListRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    created_at: datetime
    updated_at: datetime
    items: list[ShoppingListItemRead]


class ComparisonItemRead(BaseModel):
    product_id: int
    product_name: str
    quantity: Decimal
    unit_price: Decimal | None
    subtotal: Decimal | None
    reported_at: datetime | None
    source_type: str | None


class MarketComparisonRead(BaseModel):
    market_id: int
    market_name: str
    complete: bool
    found_items: int
    total_items: int
    total: Decimal | None
    items: list[ComparisonItemRead]


class ComparisonRead(BaseModel):
    shopping_list_id: int
    list_name: str
    results: list[MarketComparisonRead]
