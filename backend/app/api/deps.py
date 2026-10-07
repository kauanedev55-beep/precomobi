"""Dependências de autenticação usadas pelos endpoints.

get_current_user       -> exige um token válido (usado em /auth/me e,
                           futuramente, em telas que só fazem sentido
                           logado, como contribuições e perfil).
get_current_user_optional -> usa o usuário do token se ele vier e for
                           válido; senão, cai para o usuário de
                           demonstração. Isso existe para não quebrar
                           o fluxo de "testar comparação" enquanto o
                           frontend de login ainda está sendo construído.
"""
from __future__ import annotations

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

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
    if not user or not user.is_active:
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
) -> User:
    user = _resolve_user(credentials, db)
    if user:
        return user
    demo = db.scalar(select(User).where(User.email == DEMO_USER_EMAIL))
    if not demo:
        raise HTTPException(status_code=500, detail="Usuário de demonstração não encontrado. Reinicie a API.")
    return demo
