from app.core.config import get_settings

import json
import logging
from collections import deque
from threading import Lock
from time import monotonic
from urllib.parse import urlencode
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select, text
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.api.deps import get_admin_user, get_current_user_optional
from app.api.prices import _confirmation_counts, _confirmed_report_ids
from app.db.session import get_db
from app.models import Market, PriceReport, Product, User
from app.schemas.mvp import MarketRead, ProductRead
from app.schemas.prices import ProductDetailRead
from app.schemas.markets import MarketCreate

router = APIRouter(tags=["catalog"])
logger = logging.getLogger(__name__)
_search_lock = Lock()
_search_cache: dict[str, tuple[float, list[dict]]] = {}
_search_requests: deque[float] = deque()


def _search_external_products(term: str) -> list[dict]:
    # OFF permits 10 searches/minute/IP. Cache repeated queries and serialize
    # access so concurrent visitors cannot exceed this process's budget.
    key = term.casefold()
    with _search_lock:
        now = monotonic()
        cached = _search_cache.get(key)
        if cached and now - cached[0] < 300:
            return cached[1]
        while _search_requests and now - _search_requests[0] >= 60:
            _search_requests.popleft()
        if len(_search_requests) >= 8:
            raise HTTPException(429, "Muitas buscas externas. Aguarde um minuto ou use o código de barras.")
        _search_requests.append(now)
        params = urlencode({
            "q": term, "langs": "pt,en", "page_size": 10,
            "fields": "code,product_name,product_name_pt,brands,categories,image_front_url",
        })
        request = Request("https://search.openfoodfacts.org/search?" + params,
                          headers={"User-Agent": "PrecoMobi/0.3 (https://precomobi-1.onrender.com/)",
                                   "Accept": "application/json"})
        try:
            with urlopen(request, timeout=5) as response:
                data = json.load(response)
            items = data.get("hits") if isinstance(data, dict) else None
            if not isinstance(items, list):
                raise ValueError("Invalid search response")
        except (TimeoutError, HTTPError, URLError, ValueError, OSError) as exc:
            logger.warning("Busca Open Food Facts indisponivel: %s", type(exc).__name__)
            raise HTTPException(503, "A busca externa está indisponível. Tente novamente ou use o código de barras.") from exc
        items = [item for item in items[:10] if isinstance(item, dict)]
        if len(_search_cache) >= 128:
            _search_cache.pop(next(iter(_search_cache)))
        _search_cache[key] = (now, items)
        return items


def _save_external_product(db: Session, ean: str, item: dict) -> Product | None:
    def value(key: str) -> str:
        raw = item.get(key)
        if isinstance(raw, list):
            raw = ",".join(part for part in raw if isinstance(part, str))
        return raw.strip() if isinstance(raw, str) else ""

    name = value("product_name_pt") or value("product_name")
    if not name:
        return None
    # Reuse existing records without overwriting names, prices or inactive flags.
    existing = db.scalar(select(Product).where(Product.ean == ean))
    if existing is not None:
        return existing if existing.is_active else None
    brand = value("brands").split(",")[0].strip()
    category = value("categories").split(",")[0].strip()
    image = value("image_front_url")
    product = Product(ean=ean, name=name[:180], brand=brand[:120] or None,
                      category=category[:100] or None,
                      image_url=image[:500] if image.startswith("https://") else None,
                      is_active=True)
    try:
        db.add(product)
        db.commit()
        db.refresh(product)
    except IntegrityError:
        db.rollback()
        product = db.scalar(select(Product).where(Product.ean == ean))
    return product if product is not None and product.is_active else None


def _import_product_by_ean(db: Session, ean: str) -> Product | None:
    """
    Consulta o Open Food Facts quando um produto
    não existe no catálogo local.

    Importa apenas informações de identificação.
    Não importa nem inventa preços.
    """

    url = (
        f"https://world.openfoodfacts.org/api/v2/product/{ean}.json"
        "?fields=code,product_name,product_name_pt,"
        "brands,categories,image_front_url,quantity"
    )

    request = Request(
        url,
        headers={
            "User-Agent": (
                "PrecoMobi/0.2 "
                "(https://precomobi-1.onrender.com/)"
            ),
            "Accept": "application/json",
        },
    )

    try:
        with urlopen(request, timeout=5) as response:
            data = json.load(response)
    except (TimeoutError, HTTPError, URLError, ValueError, OSError) as exc:
        logger.warning(
            "Consulta Open Food Facts indisponivel: %s",
            type(exc).__name__,
        )
        return None

    if not isinstance(data, dict) or data.get("status") != 1:
        return None

    item = data.get("product")

    if not isinstance(item, dict):
        return None

    return _save_external_product(db, ean, item)


def _cheapest_price_by_product(
    db: Session,
    product_ids: list[int],
) -> dict[int, dict]:

    if not product_ids:
        return {}

    reports = db.scalars(
        select(PriceReport)
        .join(Market)
        .where(
            PriceReport.product_id.in_(product_ids),
            PriceReport.is_active.is_(True),
            (True if get_settings().demo_mode else PriceReport.source_type != "development"),
            Market.is_active.is_(True),
        )
        .order_by(
            PriceReport.reported_at.desc(),
            PriceReport.id.desc(),
        )
    )

    latest_by_product_market = {}

    for report in reports:
        key = (report.product_id, report.market_id)
        latest_by_product_market.setdefault(key, report)

    cheapest = {}

    for (product_id, _market_id), report in (
        latest_by_product_market.items()
    ):
        current = cheapest.get(product_id)

        if current is None or report.price < current.price:
            cheapest[product_id] = report

    return {
        product_id: {
            "min_price": report.price,
            "min_price_market": report.market.name,
        }
        for product_id, report in cheapest.items()
    }


@router.get("/products", response_model=list[ProductRead])
def list_products(
    ean: str | None = Query(default=None),
    q: str | None = Query(
        default=None,
        max_length=100,
        description="Busca por nome, marca ou categoria",
    ),
    db: Session = Depends(get_db),
) -> list[dict]:

    query = select(Product).where(
        Product.is_active.is_(True)
    )

    if ean is not None:
        product = db.scalar(
            query.where(Product.ean == ean)
        )

        if (
            product is None
            and ean.isdecimal()
            and len(ean) in (8, 12, 13, 14)
        ):
            product = _import_product_by_ean(db, ean)

        if product is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    "EAN nao encontrado no catalogo ou "
                    "no Open Food Facts. Tente outro codigo."
                ),
            )

        products = [product]

    else:
        if q and q.strip():
            term = f"%{q.strip()}%"

            query = query.where(
                or_(
                    Product.name.ilike(term),
                    Product.brand.ilike(term),
                    Product.category.ilike(term),
                )
            )

        products = list(
            db.scalars(
                query.order_by(Product.name)
            )
        )
        if not products and q and len(q.strip()) >= 3:
            by_id = {}
            for item in _search_external_products(q.strip()):
                code = item.get("code")
                if not isinstance(code, str) or not code.isascii() or not code.isdecimal() or len(code) not in (8, 12, 13, 14):
                    continue
                product = _save_external_product(db, code, item)
                if product is not None:
                    by_id[product.id] = product
            products = list(by_id.values())

    cheapest = _cheapest_price_by_product(
        db,
        [product.id for product in products],
    )

    return [
        {
            **ProductRead.model_validate(product).model_dump(),
            **cheapest.get(product.id, {}),
        }
        for product in products
    ]


@router.get(
    "/products/{product_id}",
    response_model=ProductDetailRead,
)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> dict:

    product = db.get(Product, product_id)

    if not product or not product.is_active:
        raise HTTPException(
            status_code=404,
            detail="Produto nao encontrado",
        )

    markets = list(
        db.scalars(
            select(Market)
            .where(Market.is_active.is_(True))
            .order_by(Market.name)
        )
    )

    reports = db.scalars(
        select(PriceReport)
        .where(
            PriceReport.product_id == product_id,
            PriceReport.is_active.is_(True),
            (True if get_settings().demo_mode else PriceReport.source_type != "development"),
        )
        .order_by(
            PriceReport.reported_at.desc(),
            PriceReport.id.desc(),
        )
    )

    latest = {}

    for report in reports:
        latest.setdefault(report.market_id, report)

    report_ids = [
        report.id for report in latest.values()
    ]

    counts = _confirmation_counts(
        db,
        report_ids,
    )

    confirmed = _confirmed_report_ids(
        db,
        report_ids,
        current_user.id,
    ) if current_user else set()

    prices = [
        {
            "report_id": (
                latest[market.id].id
                if market.id in latest else None
            ),
            "market_id": market.id,
            "market_name": market.name,
            "price": (
                latest[market.id].price
                if market.id in latest else None
            ),
            "reported_at": (
                latest[market.id].reported_at
                if market.id in latest else None
            ),
            "source_type": (
                latest[market.id].source_type
                if market.id in latest else None
            ),
            "confirmations_count": (
                counts.get(latest[market.id].id, 0)
                if market.id in latest else 0
            ),
            "confirmed_by_me": (
                latest[market.id].id in confirmed
                if market.id in latest else False
            ),
            "is_mine": bool(current_user and market.id in latest and latest[market.id].user_id == current_user.id),
        }
        for market in markets
    ]

    cheapest = _cheapest_price_by_product(
        db,
        [product_id],
    ).get(product_id, {})

    return {
        **ProductRead.model_validate(product).model_dump(),
        **cheapest,
        "prices": prices,
    }


@router.get("/markets", response_model=list[MarketRead])
def list_markets(
    db: Session = Depends(get_db),
) -> list[Market]:

    return list(
        db.scalars(
            select(Market)
            .where(Market.is_active.is_(True))
            .order_by(Market.name)
        )
    )


@router.post("/markets", response_model=MarketRead, status_code=201)
def create_market(payload: MarketCreate, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)) -> Market:
    # Serialize rare administrative creates in PostgreSQL to avoid duplicate units.
    if db.get_bind().dialect.name == "postgresql":
        db.execute(text("SELECT pg_advisory_xact_lock(73110427)"))
    duplicate = db.scalar(select(Market).where(
        func.lower(Market.name) == payload.name.lower(),
        func.lower(Market.address) == payload.address.lower(),
        func.lower(Market.city) == payload.city.lower(), Market.state == payload.state,
    ))
    if duplicate:
        raise HTTPException(409, "Esta unidade já está cadastrada. Nenhum registro foi alterado.")
    market = Market(**payload.model_dump(), is_active=True)
    db.add(market)
    db.commit()
    db.refresh(market)
    logger.info("Mercado %s cadastrado pelo administrador %s", market.id, admin.id)
    return market
