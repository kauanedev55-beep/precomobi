"""Troca um token Supabase validado por uma sessão da API já existente."""
from secrets import token_urlsafe
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
import json
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.core.email import send_welcome_email, configured as email_configured
from app.core.security import create_access_token, hash_password
from app.db.session import get_db
from app.models import User
from app.schemas.auth import TokenRead

router = APIRouter(prefix="/auth", tags=["auth"])

class SupabaseSession(BaseModel):
    access_token: str = Field(min_length=30, max_length=8192)

@router.post("/supabase-session", response_model=TokenRead)
def supabase_session(payload: SupabaseSession, tasks: BackgroundTasks, db: Session = Depends(get_db)):
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise HTTPException(503, "Supabase ainda não foi configurado.")
    url = settings.supabase_url.rstrip("/")
    if not url.startswith("https://"):
        raise HTTPException(503, "Endereço do Supabase inválido.")
    req = Request(url + "/auth/v1/user", headers={
        "apikey": settings.supabase_anon_key,
        "Authorization": "Bearer " + payload.access_token,
        "Accept": "application/json",
    })
    try:
        with urlopen(req, timeout=12) as response:
            identity = json.load(response)
    except HTTPError as exc:
        raise HTTPException(401 if exc.code in (400, 401, 403) else 502, "Sessão Supabase inválida ou indisponível.") from exc
    except (URLError, TimeoutError, ValueError) as exc:
        raise HTTPException(502, "Não foi possível verificar a sessão.") from exc
    if not isinstance(identity, dict):
        raise HTTPException(502, "Resposta inválida do serviço de autenticação.")
    email = str(identity.get("email") or "").strip().lower()
    if not identity.get("id") or not email or not identity.get("email_confirmed_at"):
        raise HTTPException(403, "Confirme o e-mail antes de entrar.")
    user = db.scalar(select(User).where(User.email == email))
    is_new = user is None
    if is_new:
        metadata = identity.get("user_metadata") or {}
        name = str(metadata.get("name") or email.split("@")[0]).strip()[:120] or "Usuário"
        user = User(name=name, email=email, password_hash=hash_password(token_urlsafe(32)), email_verified=True)
        db.add(user)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            user = db.scalar(select(User).where(User.email == email))
            is_new = False
    if user and not user.email_verified:
        user.email_verified = True
        db.commit()
    if not user or not user.is_active:
        raise HTTPException(403, "Conta desativada.")
    if is_new and email_configured():
        tasks.add_task(send_welcome_email, user.email, user.name)
    return {"access_token": create_access_token(user.id), "user": user}
