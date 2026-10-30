import io
import json
from contextlib import contextmanager

import pytest
from sqlalchemy import create_engine, delete, func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.base import Base
from app.db.requested_markets import REQUESTED, add_requested_markets
from app.models import Market, PriceReport, User
from app.db.session import SessionLocal
from conftest import register_user


@pytest.fixture(autouse=True)
def isolate_created_markets(client):
    # This suite shares a temporary DB with legacy comparison tests.
    with SessionLocal() as db:
        original = list(db.scalars(select(Market.id)))
    yield
    with SessionLocal() as db:
        db.execute(delete(Market).where(Market.id.not_in(original)))
        db.commit()


def test_only_verified_server_configured_admin_can_create_market(client, monkeypatch):
    regular, regular_user = register_user(client)
    admin, admin_user = register_user(client)
    settings = get_settings()
    monkeypatch.setattr(settings, 'admin_emails', ' ' + admin_user['email'].upper() + ' ')
    assert client.get('/api/auth/me', headers=admin).json()['is_admin'] is True
    assert client.get('/api/auth/me', headers=regular).json()['is_admin'] is False
    payload = {'name': 'Mercado teste administrativo', 'address': ' Rua Teste, 10 ', 'city': ' Serra ', 'state': 'es'}
    assert client.post('/api/markets', json=payload).status_code == 401
    assert client.post('/api/markets', headers=regular, json=payload).status_code == 403
    before = client.get('/api/markets').json()
    created = client.post('/api/markets', headers=admin, json=payload)
    assert created.status_code == 201
    market = created.json()
    assert market['latitude'] is None and market['longitude'] is None
    assert market['address'] == 'Rua Teste, 10' and market['city'] == 'Serra' and market['state'] == 'ES'
    assert market['id'] in [r['id'] for r in client.get('/api/markets', headers=regular).json()]
    assert len(client.get('/api/markets').json()) == len(before) + 1
    assert client.post('/api/markets', headers=admin, json=payload).status_code == 409
    assert client.get(f"/api/products/1").status_code == 200
    # Revoking the server setting takes effect even for an existing token.
    monkeypatch.setattr(settings, 'admin_emails', '')
    assert client.get('/api/auth/me', headers=admin).json()['is_admin'] is False
    assert client.post('/api/markets', headers=admin, json=payload).status_code == 403


@pytest.mark.parametrize('changes', [
    {'name': '  '}, {'address': '   '}, {'city': ''}, {'state': 'XX'},
    {'latitude': 91, 'longitude': 10}, {'latitude': 10}, {'is_admin': True},
])
def test_market_input_is_validated(client, monkeypatch, changes):
    admin, user = register_user(client)
    monkeypatch.setattr(get_settings(), 'admin_emails', user['email'])
    payload = {'name': 'Mercado teste inválido', 'address': 'Rua Teste, 10', 'city': 'Serra', 'state': 'ES', **changes}
    assert client.post('/api/markets', headers=admin, json=payload).status_code == 422


def test_supabase_metadata_cannot_grant_admin(client, monkeypatch):
    monkeypatch.setattr(get_settings(), 'admin_emails', '')
    monkeypatch.setattr(get_settings(), 'supabase_url', 'https://example.supabase.co')
    monkeypatch.setattr(get_settings(), 'supabase_anon_key', 'public-test')
    @contextmanager
    def upstream(*args, **kwargs):
        yield io.StringIO(json.dumps({'id': 'verified-test', 'email': 'not-admin@example.com',
            'email_confirmed_at': '2026-01-01', 'user_metadata': {'role': 'admin', 'is_admin': True}}))
    monkeypatch.setattr('app.api.supabase_auth.urlopen', upstream)
    response = client.post('/api/auth/supabase-session', json={'access_token': 'x' * 40})
    assert response.status_code == 200
    assert response.json()['user']['is_admin'] is False


def test_inactive_and_unverified_accounts_are_never_admin(monkeypatch):
    monkeypatch.setattr(get_settings(), 'admin_emails', 'owner@example.com')
    user = User(email='owner@example.com', name='Owner', password_hash='unused', is_active=True, email_verified=False)
    assert user.is_admin is False
    user.email_verified = True
    assert user.is_admin is True
    user.is_active = False
    assert user.is_admin is False


def test_requested_markets_import_once_without_overwriting_or_prices(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'markets.db'}")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        old = Market(**{**REQUESTED[0], 'address': 'Endereço já cadastrado'}, is_active=True)
        db.add(old)
        db.commit()
        old_id = old.id
    add_requested_markets(engine)
    with Session(engine) as db:
        rows = list(db.scalars(select(Market)))
        assert len(rows) == 3
        assert db.get(Market, old_id).address == 'Endereço já cadastrado'
        assert all(m.latitude is None and m.longitude is None for m in rows)
        assert db.scalar(select(func.count()).select_from(PriceReport)) == 0
        db.get(Market, old_id).name = 'Nome alterado posteriormente'
        db.commit()
    add_requested_markets(engine)
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(Market)) == 3
        assert db.get(Market, old_id).name == 'Nome alterado posteriormente'
    engine.dispose()
