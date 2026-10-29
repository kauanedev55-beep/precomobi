from app.core.config import get_settings
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, get_current_user_optional
from app.db.session import get_db
from app.models import Market, PriceConfirmation, PriceReport, Product, User
from app.schemas.prices import PriceConfirmationCreate, PriceReportCreate, PriceReportRead

router = APIRouter(prefix="/price-reports", tags=["prices"])


def _base_query():
    return (
        select(PriceReport)
        .options(joinedload(PriceReport.product), joinedload(PriceReport.market))
        .where(PriceReport.is_active.is_(True), True if get_settings().demo_mode else PriceReport.source_type != "development")
    )


def _confirmation_counts(db: Session, report_ids: list[int]) -> dict[int, int]:
    if not report_ids:
        return {}
    rows = db.execute(
        select(PriceConfirmation.price_report_id, func.count(PriceConfirmation.id))
        .where(PriceConfirmation.price_report_id.in_(report_ids))
        .group_by(PriceConfirmation.price_report_id)
    )
    return dict(rows.all())


def _confirmed_report_ids(db: Session, report_ids: list[int], user_id: int) -> set[int]:
    if not report_ids:
        return set()
    rows = db.scalars(
        select(PriceConfirmation.price_report_id).where(
            PriceConfirmation.price_report_id.in_(report_ids), PriceConfirmation.user_id == user_id
        )
    )
    return set(rows.all())


def _to_read(report: PriceReport, counts: dict[int, int] | None = None, confirmed_ids: set[int] | None = None) -> dict:
    return {
        "id": report.id,
        "product_id": report.product_id,
        "product_name": report.product.name,
        "market_id": report.market_id,
        "market_name": report.market.name,
        "price": report.price,
        "reported_at": report.reported_at,
        "source_type": report.source_type,
        "notes": report.notes,
        "confirmations_count": (counts or {}).get(report.id, 0),
        "confirmed_by_me": report.id in (confirmed_ids or set()),
    }


@router.post("", response_model=PriceReportRead, status_code=201)
def create_price_report(
    payload: PriceReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Contribuição da comunidade. Sempre cria uma NOVA observação (o histórico nunca é sobrescrito)."""
    product = db.get(Product, payload.product_id)
    market = db.get(Market, payload.market_id)
    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")
    if not market or not market.is_active:
        raise HTTPException(status_code=404, detail="Mercado não encontrado.")

    observed_at = payload.observed_at
    if observed_at is not None:
        if observed_at.tzinfo is None:
            observed_at = observed_at.replace(tzinfo=timezone.utc)
        observed_at = observed_at.astimezone(timezone.utc)
        if observed_at > datetime.now(timezone.utc):
            raise HTTPException(status_code=422, detail="A data da observação não pode estar no futuro.")

    report = PriceReport(
        product_id=product.id,
        market_id=market.id,
        user_id=current_user.id,
        price=payload.price,
        source_type="community",
        notes=payload.notes.strip() if payload.notes else None,
    )
    if observed_at is not None:
        report.reported_at = observed_at
    db.add(report)
    db.commit()
    report = db.scalar(_base_query().where(PriceReport.id == report.id))
    return _to_read(report)


@router.post("/{report_id}/confirm", response_model=PriceReportRead, status_code=201)
def confirm_price_report(
    report_id: int,
    payload: PriceConfirmationCreate | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Um segundo usuário confirma que um preço já informado continua válido.
    Não substitui o preço — é só um sinal de confiabilidade a mais, somado ao histórico."""
    report = db.scalar(_base_query().where(PriceReport.id == report_id))
    if not report:
        raise HTTPException(status_code=404, detail="Preço não encontrado.")
    if report.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Você não pode confirmar um preço que você mesmo informou.")

    confirmation = PriceConfirmation(
        price_report_id=report.id,
        user_id=current_user.id,
        observed_price=(payload.observed_price if payload else None),
    )
    db.add(confirmation)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Você já confirmou este preço.")

    counts = _confirmation_counts(db, [report.id])
    return _to_read(report, counts, {report.id})


@router.get("/mine", response_model=list[PriceReportRead])
def my_price_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[dict]:
    reports = list(
        db.scalars(
            _base_query()
            .where(PriceReport.user_id == current_user.id)
            .order_by(PriceReport.reported_at.desc(), PriceReport.id.desc())
        ).unique()
    )
    counts = _confirmation_counts(db, [report.id for report in reports])
    confirmed = _confirmed_report_ids(db, [report.id for report in reports], current_user.id) if current_user else set()
    return [_to_read(report, counts, confirmed) for report in reports]


@router.get("", response_model=list[PriceReportRead])
def price_history(
    product_id: int | None = Query(default=None),
    market_id: int | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> list[dict]:
    """Histórico público de preços (mais recentes primeiro), com a origem de cada um."""
    query = _base_query()
    if product_id is not None:
        query = query.where(PriceReport.product_id == product_id)
    if market_id is not None:
        query = query.where(PriceReport.market_id == market_id)
    reports = list(db.scalars(query.order_by(PriceReport.reported_at.desc(), PriceReport.id.desc()).limit(limit)).unique())
    counts = _confirmation_counts(db, [report.id for report in reports])
    confirmed = _confirmed_report_ids(db, [report.id for report in reports], current_user.id) if current_user else set()
    return [_to_read(report, counts, confirmed) for report in reports]
