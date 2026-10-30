from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    verification_token_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    verification_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    verification_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    @property
    def is_admin(self) -> bool:
        from app.core.config import get_settings
        return bool(self.is_active and self.email_verified and self.email.casefold() in get_settings().admin_emails_set)

    price_reports: Mapped[list["PriceReport"]] = relationship(back_populates="reporter")
    shopping_lists: Mapped[list["ShoppingList"]] = relationship(back_populates="owner")
    confirmations: Mapped[list["PriceConfirmation"]] = relationship(back_populates="user")


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    ean: Mapped[Optional[str]] = mapped_column(String(14), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(180))
    brand: Mapped[Optional[str]] = mapped_column(String(120))
    category: Mapped[Optional[str]] = mapped_column(String(100))
    quantity_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 3))
    quantity_unit: Mapped[Optional[str]] = mapped_column(String(20))
    image_url: Mapped[Optional[str]] = mapped_column(String(500))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    price_reports: Mapped[list["PriceReport"]] = relationship(back_populates="product")
    list_items: Mapped[list["ShoppingListItem"]] = relationship(back_populates="product")


class Market(Base):
    __tablename__ = "markets"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    address: Mapped[str] = mapped_column(String(255))
    neighborhood: Mapped[Optional[str]] = mapped_column(String(120))
    city: Mapped[str] = mapped_column(String(120), default="Serra")
    state: Mapped[str] = mapped_column(String(2), default="ES")
    latitude: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 7))
    longitude: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 7))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    price_reports: Mapped[list["PriceReport"]] = relationship(back_populates="market")


class PriceReport(Base):
    __tablename__ = "price_reports"
    __table_args__ = (
        Index("ix_price_reports_product_market_reported", "product_id", "market_id", "reported_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    market_id: Mapped[int] = mapped_column(ForeignKey("markets.id"), index=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), index=True)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    reported_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    source_type: Mapped[str] = mapped_column(String(30), default="development")
    notes: Mapped[Optional[str]] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    product: Mapped[Product] = relationship(back_populates="price_reports")
    market: Mapped[Market] = relationship(back_populates="price_reports")
    reporter: Mapped[Optional[User]] = relationship(back_populates="price_reports")
    confirmations: Mapped[list["PriceConfirmation"]] = relationship(back_populates="price_report")


class PriceConfirmation(Base):
    __tablename__ = "price_confirmations"
    __table_args__ = (UniqueConstraint("price_report_id", "user_id", name="uq_confirmation_report_user"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    price_report_id: Mapped[int] = mapped_column(ForeignKey("price_reports.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="confirmed")
    observed_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    price_report: Mapped[PriceReport] = relationship(back_populates="confirmations")
    user: Mapped[User] = relationship(back_populates="confirmations")


class ShoppingList(Base):
    __tablename__ = "shopping_lists"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(160))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner: Mapped[User] = relationship(back_populates="shopping_lists")
    items: Mapped[list["ShoppingListItem"]] = relationship(back_populates="shopping_list", cascade="all, delete-orphan")


class ShoppingListItem(Base):
    __tablename__ = "shopping_list_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    shopping_list_id: Mapped[int] = mapped_column(ForeignKey("shopping_lists.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    quantity: Mapped[Decimal] = mapped_column(Numeric(10, 3), default=1)
    is_purchased: Mapped[bool] = mapped_column(Boolean, default=False)

    shopping_list: Mapped[ShoppingList] = relationship(back_populates="items")
    product: Mapped[Product] = relationship(back_populates="list_items")
