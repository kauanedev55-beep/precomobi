"""City selection is explicit, accent-insensitive, and scoped to Espírito Santo."""
import unicodedata
from sqlalchemy import select
from app.models import Market


def normalize_city(value: str) -> str:
    return ''.join(c for c in unicodedata.normalize('NFKD', value.strip().casefold()) if not unicodedata.combining(c))


def matches_city(market: Market, city: str | None) -> bool:
    if city is None:
        return True  # Existing API clients remain compatible.
    return market.state.strip().upper() == 'ES' and (city == '*' or normalize_city(market.city) == normalize_city(city))


def region_market_ids(db, city: str) -> list[int]:
    return [m.id for m in db.scalars(select(Market).where(Market.is_active.is_(True))) if matches_city(m, city)]
