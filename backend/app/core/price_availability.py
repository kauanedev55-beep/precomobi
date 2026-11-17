"""One current-price rule for search, market selection and comparisons."""
from sqlalchemy import select,or_,func
from app.core.config import get_settings
from app.core.region import region_market_ids
from app.models import PriceReport,Product


def current_price_conditions():
    return (PriceReport.is_active.is_(True),or_(PriceReport.expires_at.is_(None),PriceReport.expires_at>func.now()),True if get_settings().demo_mode else PriceReport.source_type!='development')


def priced_product_ids(db,city=None):
    return select(PriceReport.product_id).join(Product).where(*current_price_conditions(),Product.is_active.is_(True),PriceReport.market_id.in_(region_market_ids(db,city)))
