from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import delete, select
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Market, User
from app.models.alerts import AlertPreference, FavoriteMarket

router=APIRouter(prefix="/alert-preferences",tags=["alerts"])
class PreferenceRead(BaseModel):
    enabled: bool = False
    scope: Literal["lists", "markets", "both"] = "lists"
    market_ids: list[int] = Field(default_factory=list, max_length=100)

    @model_validator(mode="after")
    def valid_markets(self):
        if len(set(self.market_ids)) != len(self.market_ids) or any(i <= 0 for i in self.market_ids):
            raise ValueError("Mercados repetidos ou inválidos")
        if self.enabled and self.scope in ("markets", "both") and not self.market_ids:
            raise ValueError("Escolha pelo menos um mercado habitual")
        return self

@router.get("",response_model=PreferenceRead)
def read_preferences(db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    pref=db.get(AlertPreference,user.id)
    return {"enabled":bool(pref and pref.enabled),"scope":pref.scope if pref else "lists",
        "market_ids":list(db.scalars(select(FavoriteMarket.market_id).where(FavoriteMarket.user_id==user.id)))}

@router.put("",response_model=PreferenceRead)
def save_preferences(payload:PreferenceRead,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    db.execute(select(User.id).where(User.id==user.id).with_for_update())
    valid=set(db.scalars(select(Market.id).where(Market.id.in_(payload.market_ids),Market.is_active.is_(True))))
    if valid != set(payload.market_ids):
        raise HTTPException(422,"Um dos mercados não está mais disponível. Atualize as opções.")
    pref=db.get(AlertPreference,user.id)
    if not pref:
        pref=AlertPreference(user_id=user.id);db.add(pref)
    pref.enabled=payload.enabled;pref.scope=payload.scope
    db.execute(delete(FavoriteMarket).where(FavoriteMarket.user_id==user.id))
    db.add_all(FavoriteMarket(user_id=user.id,market_id=i) for i in sorted(valid))
    db.commit()
    return payload
