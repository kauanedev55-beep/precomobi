"""Community offers are separate from unconditional price observations.

An offer can require a club or a minimum quantity, so it never silently replaces
the ordinary basket price. Alerts are matched to the authenticated user's lists.
"""
from datetime import datetime, timezone
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, field_validator, model_validator
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.core.region import region_market_ids
from app.models import Market, Product, ShoppingList, ShoppingListItem, User
from app.models.family import ListMember
from app.models.offers import Offer, OfferCheck
from app.models.alerts import AlertPreference, FavoriteMarket
from app.schemas.mvp import MarketRead

router = APIRouter(prefix="/offers", tags=["offers"])


def utc(value):
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


class OfferCreate(BaseModel):
    product_id: int
    market_id: int
    price: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    sale_unit: Literal["unit", "kg"] | None = None
    conditions: str = Field(min_length=5, max_length=500)
    observed_at: datetime | None = None
    expires_at: datetime

    @field_validator("conditions", mode="before")
    @classmethod
    def clean_conditions(cls, value):
        return value.strip() if isinstance(value, str) else value

    @model_validator(mode="after")
    def valid_dates(self):
        now = datetime.now(timezone.utc)
        self.observed_at = utc(self.observed_at) if self.observed_at else now
        self.expires_at = utc(self.expires_at)
        if self.observed_at > now or self.expires_at <= now or self.expires_at <= self.observed_at:
            raise ValueError("Informe uma observação passada e uma validade futura")
        return self


class CheckCreate(BaseModel):
    status: Literal["confirmed", "changed", "ended"]
    observed_price: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)

    @model_validator(mode="after")
    def changed_needs_price(self):
        if self.status == "changed" and self.observed_price is None:
            raise ValueError("Informe o novo preço que você viu")
        if self.status != "changed" and self.observed_price is not None:
            raise ValueError("Novo preço só deve acompanhar um aviso de preço alterado")
        return self


class OfferRead(BaseModel):
    source_url: str | None = None
    source_label: str | None = None
    related_offers: list["OfferRead"] = Field(default_factory=list)
    id: int
    product_id: int
    product_name: str
    sale_unit: Literal["unit", "kg"] = "unit"
    image_url: str | None
    market: MarketRead
    price: Decimal
    conditions: str
    observed_at: datetime
    expires_at: datetime
    state: Literal["active", "expired", "ended"]
    confirmations: int
    changed_reports: int
    ended_reports: int
    my_check: str | None
    is_mine: bool


def base_query():
    return select(Offer).options(joinedload(Offer.product), joinedload(Offer.market))


def to_reads(db, offers, user):
    ids = [o.id for o in offers]
    counts, own = {}, {}
    if ids:
        for oid, status, count in db.execute(select(OfferCheck.offer_id, OfferCheck.status, func.count())
                .where(OfferCheck.offer_id.in_(ids)).group_by(OfferCheck.offer_id, OfferCheck.status)):
            counts[(oid, status)] = count
        own = dict(db.execute(select(OfferCheck.offer_id, OfferCheck.status)
                   .where(OfferCheck.offer_id.in_(ids), OfferCheck.user_id == user.id)).all())
    now = datetime.now(timezone.utc)
    return [dict(source_url=o.source_url,source_label=o.source_label,id=o.id, product_id=o.product_id, product_name=o.product.name, sale_unit=o.product.sale_unit,
        image_url=o.product.image_url, market=MarketRead.model_validate(o.market),
        price=o.price, conditions=o.conditions, observed_at=utc(o.observed_at), expires_at=utc(o.expires_at),
        state="ended" if o.ended_at else "expired" if utc(o.expires_at) <= now else "active",
        confirmations=counts.get((o.id,"confirmed"),0), changed_reports=counts.get((o.id,"changed"),0),
        ended_reports=counts.get((o.id,"ended"),0), my_check=own.get(o.id), is_mine=o.user_id == user.id)
        for o in offers]


def group_offers(rows):
    groups = {}
    for row in rows:
        key = (row['source_url'], row['source_label'], row['product_id'], str(row['price']), row['conditions'], row['expires_at'], row['state']) if row.get('source_url') else ('community', row['id'])
        if key not in groups:
            groups[key] = {**row, 'related_offers': []}
        else:
            groups[key]['related_offers'].append(row)
    # Preserve recency within a chain, while keeping different chains visible.
    chains = {}
    for group in groups.values():
        chain = group['source_label'].split(' · ')[0] if group.get('source_url') and group.get('source_label') else 'Comunidade'
        chains.setdefault(chain, []).append(group)
    result = []
    for index in range(max((len(items) for items in chains.values()), default=0)):
        result.extend(items[index] for items in chains.values() if index < len(items))
    return result


@router.get("", response_model=list[OfferRead])
def list_offers(for_my_lists: bool = False, mine: bool = False, for_alerts: bool = False, grouped: bool = False,
        product_ids: str = Query(default="", max_length=2200),
    city: str | None = Query(default=None, min_length=1, max_length=100),
        db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ids = []
    if product_ids:
        parts = product_ids.split(",")
        if len(parts) > 200 or any(not p.isascii() or not p.isdecimal() or len(p) > 10 or int(p) <= 0 for p in parts):
            raise HTTPException(422, "Produtos inválidos para filtrar as ofertas")
        ids = [int(p) for p in parts]
    query = base_query().join(Product).join(Market, Offer.market_id == Market.id).where(Product.is_active.is_(True), Market.is_active.is_(True))
    if for_alerts:
        pref=db.get(AlertPreference,user.id)
        if not pref or not pref.enabled:
            return []
        filters=[]
        if pref.scope in ("lists","both"):
            saved_ids=select(ShoppingListItem.product_id).join(ShoppingList).where(or_(ShoppingList.user_id==user.id,ShoppingList.id.in_(select(ListMember.list_id).where(ListMember.user_id==user.id))))
            filters.append(and_(or_(Offer.product_id.in_(saved_ids),Offer.product_id.in_(ids)),
                True if city is None else Offer.market_id.in_(region_market_ids(db,city))))
        if pref.scope in ("markets","both"):
            favorites=select(FavoriteMarket.market_id).where(FavoriteMarket.user_id==user.id)
            filters.append(Offer.market_id.in_(favorites))
        query=query.where(or_(*filters),Offer.user_id!=user.id)
    if mine:
        query = query.where(Offer.user_id == user.id)
    else:
        query = query.where(Offer.ended_at.is_(None), Offer.expires_at > datetime.now(timezone.utc))
    if for_my_lists and not for_alerts:
        saved = select(ShoppingListItem.product_id).join(ShoppingList).where(or_(ShoppingList.user_id==user.id,ShoppingList.id.in_(select(ListMember.list_id).where(ListMember.user_id==user.id))))
        query = query.where(or_(Offer.product_id.in_(saved), Offer.product_id.in_(ids)))
    elif ids and not for_alerts:
        query = query.where(Offer.product_id.in_(ids))
    if city is not None and not for_alerts:
        query = query.where(Offer.market_id.in_(region_market_ids(db, city)))
    ordered = query.order_by(Offer.created_at.desc(), Offer.id.desc())
    if not grouped or mine:
        offers = list(db.scalars(ordered.limit(100)).unique())
        return to_reads(db, offers, user)
    # A store-level cutoff can hide entire chains behind repeated leaflet rows.
    # Filter first, then group verified identical offers, then cap display cards.
    offers = list(db.scalars(ordered).unique())
    return group_offers(to_reads(db, offers, user))[:100]


@router.post("", response_model=OfferRead, status_code=201)
def create_offer(payload: OfferCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    product, market = db.get(Product, payload.product_id), db.get(Market, payload.market_id)
    if not product or not product.is_active or not market or not market.is_active:
        raise HTTPException(404, "Produto ou mercado não encontrado")
    if payload.sale_unit is not None and payload.sale_unit != product.sale_unit:
        raise HTTPException(422, "A unidade do preço difere da unidade de venda do produto.")
    offer = Offer(**payload.model_dump(exclude={"sale_unit"}), user_id=user.id)
    db.add(offer)
    db.commit()
    offer = db.scalar(base_query().where(Offer.id == offer.id))
    return to_reads(db, [offer], user)[0]


@router.post("/{offer_id}/check", response_model=OfferRead)
def check_offer(offer_id: int, payload: CheckCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    offer = db.scalar(base_query().where(Offer.id == offer_id).with_for_update(of=Offer))
    if not offer:
        raise HTTPException(404, "Oferta não encontrada")
    if offer.ended_at or utc(offer.expires_at) <= datetime.now(timezone.utc):
        raise HTTPException(409, "Essa oferta já foi encerrada ou venceu")
    if offer.user_id == user.id:
        raise HTTPException(400, "Você não pode confirmar a própria oferta. Pode encerrá-la quando acabar.")
    if payload.status == "changed" and payload.observed_price == offer.price:
        raise HTTPException(422, "O valor é igual ao anunciado. Use a confirmação de preço.")
    row = db.scalar(select(OfferCheck).where(OfferCheck.offer_id == offer_id, OfferCheck.user_id == user.id))
    if row is None:
        row = OfferCheck(offer_id=offer_id, user_id=user.id)
        db.add(row)
    row.status, row.observed_price, row.updated_at = payload.status, payload.observed_price, datetime.now(timezone.utc)
    db.commit()
    return to_reads(db, [offer], user)[0]


@router.post("/{offer_id}/end", response_model=OfferRead)
def end_offer(offer_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    offer = db.scalar(base_query().where(Offer.id == offer_id))
    if not offer or (offer.user_id != user.id and not user.is_admin):
        raise HTTPException(404, "Oferta não encontrada")
    if offer.ended_at is None:
        offer.ended_at = datetime.now(timezone.utc)
        db.commit()
    return to_reads(db, [offer], user)[0]
