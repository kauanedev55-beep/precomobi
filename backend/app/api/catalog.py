from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_optional
from app.api.prices import _confirmation_counts, _confirmed_report_ids
from app.db.session import get_db
from app.models import Market, PriceReport, Product, User
from app.schemas.mvp import MarketRead, ProductRead
from app.schemas.prices import ProductDetailRead

router = APIRouter(tags=["catalog"])


@router.get("/products", response_model=list[ProductRead])
def list_products(
    ean: str | None = Query(default=None),
    q: str | None = Query(default=None, description="Busca por nome, marca ou categoria"),
    db: Session = Depends(get_db),
) -> list[dict]:
    query = select(Product).where(Product.is_active.is_(True))
    if ean is not None:
        product = db.scalar(query.where(Product.ean == ean))
        if product is None:
            raise HTTPException(status_code=404, detail="Produto não encontrado para o EAN informado")
        products = [product]
    else:
        if q and q.strip():
            term = f"%{q.strip()}%"
            query = query.where(or_(Product.name.ilike(term), Product.brand.ilike(term), Product.category.ilike(term)))
        products = list(db.scalars(query.order_by(Product.name)))

    cheapest = _cheapest_price_by_product(db, [product.id for product in products])
    return [
        {**ProductRead.model_validate(product).model_dump(), **cheapest.get(product.id, {})}
        for product in products
    ]


def _cheapest_price_by_product(db: Session, product_ids: list[int]) -> dict[int, dict]:
    """Para cada produto, o menor valor entre o preço mais recente de cada mercado.
    Usado só para destacar o preço na listagem — a comparação de verdade (por lista)
    continua em app/api/comparisons.py."""
    if not product_ids:
        return {}
    reports = db.scalars(
        select(PriceReport)
        .join(Market)
        .where(PriceReport.product_id.in_(product_ids), PriceReport.is_active.is_(True), Market.is_active.is_(True))
        .order_by(PriceReport.reported_at.desc(), PriceReport.id.desc())
    )
    latest_by_product_market: dict[tuple[int, int], PriceReport] = {}
    for report in reports:  # já vem do mais recente para o mais antigo
        latest_by_product_market.setdefault((report.product_id, report.market_id), report)

    cheapest: dict[int, PriceReport] = {}
    for (product_id, _market_id), report in latest_by_product_market.items():
        current = cheapest.get(product_id)
        if current is None or report.price < current.price:
            cheapest[product_id] = report

    return {
        product_id: {"min_price": report.price, "min_price_market": report.market.name}
        for product_id, report in cheapest.items()
    }


@router.get("/products/{product_id}", response_model=ProductDetailRead)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> dict:
    product = db.get(Product, product_id)
    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    markets = list(db.scalars(select(Market).where(Market.is_active.is_(True)).order_by(Market.name)))
    reports = db.scalars(
        select(PriceReport)
        .where(PriceReport.product_id == product_id, PriceReport.is_active.is_(True))
        .order_by(PriceReport.reported_at.desc(), PriceReport.id.desc())
    )
    latest = {}
    for report in reports:  # já vem do mais recente para o mais antigo
        latest.setdefault(report.market_id, report)

    report_ids = [report.id for report in latest.values()]
    counts = _confirmation_counts(db, report_ids)
    confirmed = _confirmed_report_ids(db, report_ids, current_user.id)

    prices = [
        {
            "report_id": latest[market.id].id if market.id in latest else None,
            "market_id": market.id,
            "market_name": market.name,
            "price": latest[market.id].price if market.id in latest else None,
            "reported_at": latest[market.id].reported_at if market.id in latest else None,
            "source_type": latest[market.id].source_type if market.id in latest else None,
            "confirmations_count": counts.get(latest[market.id].id, 0) if market.id in latest else 0,
            "confirmed_by_me": latest[market.id].id in confirmed if market.id in latest else False,
        }
        for market in markets
    ]
    cheapest = _cheapest_price_by_product(db, [product_id]).get(product_id, {})
    return {**ProductRead.model_validate(product).model_dump(), **cheapest, "prices": prices}


@router.get("/markets", response_model=list[MarketRead])
def list_markets(db: Session = Depends(get_db)) -> list[Market]:
    return list(db.scalars(select(Market).where(Market.is_active.is_(True)).order_by(Market.name)))
