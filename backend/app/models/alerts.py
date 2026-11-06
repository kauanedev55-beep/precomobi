from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class AlertPreference(Base):
    __tablename__ = "alert_preferences"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    scope: Mapped[str] = mapped_column(String(20), default="lists")

class FavoriteMarket(Base):
    __tablename__ = "favorite_markets"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    market_id: Mapped[int] = mapped_column(ForeignKey("markets.id"), primary_key=True)
