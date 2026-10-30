from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class MarketCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=2, max_length=160)
    address: str = Field(min_length=3, max_length=255)
    neighborhood: str | None = Field(default=None, max_length=120)
    city: str = Field(min_length=2, max_length=120)
    state: str = Field(min_length=2, max_length=2)
    latitude: Decimal | None = Field(default=None, ge=-90, le=90, max_digits=10, decimal_places=7)
    longitude: Decimal | None = Field(default=None, ge=-180, le=180, max_digits=10, decimal_places=7)

    @field_validator("name", "address", "neighborhood", "city", "state", mode="before")
    @classmethod
    def clean_text(cls, value):
        return " ".join(value.split()) if isinstance(value, str) else value

    @field_validator("state")
    @classmethod
    def valid_state(cls, value):
        value = value.upper()
        if value not in {"AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"}:
            raise ValueError("Informe uma UF válida")
        return value

    @model_validator(mode="after")
    def coordinate_pair(self):
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Preencha latitude e longitude juntas ou deixe ambas vazias")
        return self
