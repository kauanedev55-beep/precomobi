"""Configuração dos testes do PreçoMobi.

Ponto mais importante: os testes NUNCA usam data/precomobi.db.
Antes de importar a aplicação, apontamos DATABASE_URL para um SQLite
temporário. Variáveis de ambiente têm prioridade sobre o arquivo .env,
então o banco real fica intacto.
"""
import atexit
import os
import shutil
import sys
import tempfile
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND_DIR))

_TMP_DIR = Path(tempfile.mkdtemp(prefix="precomobi-tests-"))
_TEST_DB = _TMP_DIR / "test.db"
os.environ["DEMO_MODE"] = "true"
os.environ["APP_ENV"] = "test"
os.environ["DATABASE_URL"] = f"sqlite:///{_TEST_DB.as_posix()}"
atexit.register(shutil.rmtree, _TMP_DIR, ignore_errors=True)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


@pytest.fixture(scope="session")
def client():
    """Cliente HTTP em memória. Ao entrar no `with`, o lifespan roda init_db(),
    que cria as tabelas e o seed de desenvolvimento no banco temporário."""
    from app.db.session import engine
    from main import app

    # Trava de segurança: se por algum motivo o banco não for o temporário, aborta.
    assert Path(engine.url.database).resolve() == _TEST_DB.resolve(), (
        "Os testes não estão usando o banco temporário. Abortando para proteger data/precomobi.db."
    )

    with TestClient(app) as test_client:
        yield test_client


def register_user(client, name="Usuária de teste", email=None, password="senha123456"):
    """Cadastra um usuário novo (e-mail único a cada chamada) e devolve o cabeçalho
    de autorização pronto para usar, junto com os dados do usuário criado."""
    import uuid

    email = email or f"user-{uuid.uuid4().hex[:10]}@teste.local"
    response = client.post("/api/auth/register", json={"name": name, "email": email, "password": password})
    assert response.status_code == 201, response.text
    # No session is granted before verification.
    assert "access_token" not in response.json()
    denied = client.post("/api/auth/login", json={"email": email, "password": password})
    assert denied.status_code == 403
    token = VERIFICATIONS[email]
    assert client.post("/api/auth/verify", json={"token": token}).status_code == 200
    login = client.post("/api/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200, login.text
    body = login.json()
    return {"Authorization": f"Bearer {body['access_token']}"}, body["user"]


VERIFICATIONS = {}

@pytest.fixture(autouse=True)
def captured_email(monkeypatch):
    monkeypatch.setattr("app.api.auth.configured", lambda: True)
    monkeypatch.setattr("app.api.auth.send_verification_email", lambda email, name, token: VERIFICATIONS.update({email: token}))
    monkeypatch.setattr("app.api.auth.send_welcome_email", lambda *args: None)

@pytest.fixture(scope="session")
def demo_headers(client):
    response = client.post("/api/auth/demo-session")
    assert response.status_code == 200
    return {"Authorization": "Bearer " + response.json()["access_token"]}
