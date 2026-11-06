from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from typing import Literal


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
    sale_unit: Literal["unit", "kg"] = "unit"
    packaging: str | None = None
    description: str | None = None
    min_price: Decimal | None = None
    min_price_market: str | None = None


class ProductCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=3, max_length=180)
    category: Literal["Frutas", "Verduras", "Legumes", "Grãos", "Laticínios", "Carnes e pescados", "Bebidas", "Padaria", "Massas", "Mercearia", "Limpeza", "Higiene", "Outros"]
    brand: str | None = Field(default=None, max_length=120)
    no_brand: bool = False
    ean: str | None = Field(default=None, max_length=14)
    no_barcode: bool = False
    sale_unit: Literal["unit", "kg"]
    packaging: Literal["A granel", "Saco", "Pacote", "Caixa", "Garrafa", "Lata", "Pote", "Bandeja", "Maço", "Unidade", "Outro"]
    quantity_value: Decimal = Field(gt=0, max_digits=10, decimal_places=3)
    quantity_unit: Literal["g", "kg", "ml", "L", "un"]
    description: str | None = Field(default=None, max_length=500)

    @field_validator("name", "brand", "ean", "description", mode="before")
    @classmethod
    def strip_text(cls, value):
        return value.strip() if isinstance(value, str) else value

    @model_validator(mode="after")
    def consistent_product(self):
        if bool(self.brand) == self.no_brand:
            raise ValueError("Informe a marca ou marque Sem marca")
        if bool(self.ean) == self.no_barcode:
            raise ValueError("Informe o código ou marque Sem código de barras")
        if self.ean:
            if not self.ean.isascii() or not self.ean.isdecimal() or len(self.ean) not in (8, 12, 13, 14):
                raise ValueError("O código deve ter 8, 12, 13 ou 14 dígitos")
            total = sum(int(n) * (3 if i % 2 == 0 else 1) for i, n in enumerate(reversed(self.ean[:-1])))
            if (10 - total % 10) % 10 != int(self.ean[-1]):
                raise ValueError("Código de barras inválido; confira os números da embalagem")
        if self.no_brand:
            self.brand = None
        if self.no_barcode:
            self.ean = None
        if self.packaging == "Outro" and (not self.description or len(self.description) < 3):
            raise ValueError("Descreva a apresentação em Detalhes adicionais")
        if self.sale_unit == "kg":
            if self.quantity_unit != "kg" or self.quantity_value != 1:
                raise ValueError("Venda por peso usa preço de referência para 1 kg")
        elif self.packaging == "A granel":
            raise ValueError("Para venda por unidade, informe a embalagem ou Unidade")
        if self.quantity_unit == "un" and self.quantity_value != self.quantity_value.to_integral_value():
            raise ValueError("A quantidade de unidades da embalagem deve ser inteira")
        return self


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
    quantity: Decimal = Field(default=1, gt=0, max_digits=10, decimal_places=3)


class ShoppingListCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    items: list[ShoppingListItemCreate] = Field(min_length=1, max_length=200)

    @field_validator("name")
    @classmethod
    def valid_name(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Informe o nome da lista")
        return value.strip()

    @field_validator("items")
    @classmethod
    def unique_products(cls, value):
        if len({item.product_id for item in value}) != len(value):
            raise ValueError("Produtos repetidos; ajuste a quantidade")
        return value


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
    sale_unit: Literal["unit", "kg"] = "unit"
    packaging: str | None = None
    unit_price: Decimal | None
    subtotal: Decimal | None
    reported_at: datetime | None
    source_type: str | None


class MarketComparisonRead(BaseModel):
    market_id: int
    market_name: str
    address: str
    neighborhood: str | None
    city: str
    state: str
    latitude: Decimal | None
    longitude: Decimal | None
    complete: bool
    found_items: int
    total_items: int
    total: Decimal | None
    available_total: Decimal
    comparable_total: Decimal | None
    items: list[ComparisonItemRead]


class ComparisonRead(BaseModel):
    shopping_list_id: int | None
    list_name: str
    results: list[MarketComparisonRead]
    common_product_ids: list[int]
    common_items_count: int
    priced_markets_count: int
