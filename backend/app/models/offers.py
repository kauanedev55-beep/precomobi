from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Index, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.entities import Market, Product


class Offer(Base):
    __tablename__ = "offers"
    __table_args__ = (Index("ix_offers_active_product", "expires_at", "product_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    market_id: Mapped[int] = mapped_column(ForeignKey("markets.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    source_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    source_label: Mapped[str | None] = mapped_column(String(120), nullable=True)
    conditions: Mapped[str] = mapped_column(String(500))
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    product: Mapped[Product] = relationship()
    market: Mapped[Market] = relationship()


class OfferCheck(Base):
    __tablename__ = "offer_checks"
    __table_args__ = (UniqueConstraint("offer_id", "user_id", name="uq_offer_check_user"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    offer_id: Mapped[int] = mapped_column(ForeignKey("offers.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[str] = mapped_column(String(20))
    observed_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
