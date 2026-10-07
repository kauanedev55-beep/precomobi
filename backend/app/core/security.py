"""Senha e token de autenticação do PreçoMobi.

Senha: hash com bcrypt. Nunca guardamos a senha em texto puro — só o
hash, que não pode ser revertido para descobrir a senha original.

Token: não usamos um serviço externo nem uma tabela de sessões no
banco. O token é o id do usuário + uma validade, assinados com
HMAC-SHA256 usando SECRET_KEY (config.py). Qualquer alteração no
conteúdo do token invalida a assinatura, então ele não pode ser
forjado sem conhecer a SECRET_KEY do servidor.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time

import bcrypt

from app.core.config import get_settings

TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7  # token válido por 7 dias


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        # password_hash não é um hash bcrypt válido (ex.: placeholder antigo)
        return False


def is_bcrypt_hash(value: str) -> bool:
    return value.startswith(("$2a$", "$2b$", "$2y$"))


def _secret() -> bytes:
    return get_settings().secret_key.encode("utf-8")


def _b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64decode(data: str) -> bytes:
    padded = data + "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(padded)


def create_access_token(user_id: int) -> str:
    payload = {"user_id": user_id, "exp": int(time.time()) + TOKEN_TTL_SECONDS}
    body = _b64encode(json.dumps(payload).encode("utf-8"))
    signature = hmac.new(_secret(), body.encode("ascii"), hashlib.sha256).digest()
    return f"{body}.{_b64encode(signature)}"


def decode_access_token(token: str) -> int | None:
    try:
        body, signature = token.split(".")
        expected = _b64encode(hmac.new(_secret(), body.encode("ascii"), hashlib.sha256).digest())
        if not hmac.compare_digest(signature, expected):
            return None
        payload = json.loads(_b64decode(body))
        if payload["exp"] < time.time():
            return None
        return int(payload["user_id"])
    except Exception:
        return None
