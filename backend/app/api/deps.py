"""Sessão obrigatória em dados privados; consultas públicas admitem ausência de token."""
from __future__ import annotations

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import User

DEMO_USER_EMAIL = "demo@precomobi.local"

_bearer_scheme = HTTPBearer(auto_error=False)


def _resolve_user(credentials: HTTPAuthorizationCredentials | None, db: Session) -> User | None:
    if not credentials:
        return None
    user_id = decode_access_token(credentials.credentials)
    if user_id is None:
        return None
    user = db.get(User, user_id)
    if not user or not user.is_active or not user.email_verified:
        return None
    if not get_settings().demo_mode and (user.email == DEMO_USER_EMAIL or user.email.endswith("@demo.precomobi.local")):
        return None
    return user


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    user = _resolve_user(credentials, db)
    if not user:
        raise HTTPException(status_code=401, detail="Faça login para continuar.")
    return user


def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    user = _resolve_user(credentials, db)
    if user:
        return user
    if credentials:
        raise HTTPException(status_code=401, detail="Sua sessão expirou. Entre novamente.")
    return None
