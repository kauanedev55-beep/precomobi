"""Regressões da entrega: privacidade, dados demonstrativos e integrações."""
import io
import json
from contextlib import contextmanager

import pytest
from pydantic import ValidationError

from app.core.config import Settings, get_settings
from app.db.session import SessionLocal
from app.models import PriceReport, Product
from conftest import register_user


def session(client):
    r = client.post('/api/auth/demo-session')
    assert r.status_code == 200
    return {'Authorization': 'Bearer ' + r.json()['access_token']}, r.json()['user']


@pytest.mark.parametrize('method,path,payload', [
    ('get', '/api/shopping-lists', None),
    ('get', '/api/shopping-lists/1', None),
    ('get', '/api/comparisons/1', None),
    ('post', '/api/shopping-lists', {'name':'Privada','items':[{'product_id':1,'quantity':1}]}),
])
def test_private_endpoints_require_session(client, method, path, payload):
    kwargs = {'json': payload} if payload else {}
    assert getattr(client, method)(path, **kwargs).status_code == 401
    assert getattr(client, method)(path, headers={'Authorization':'Bearer invalid'}, **kwargs).status_code == 401


def test_demo_visitors_are_isolated(client):
    ha, ua = session(client)
    hb, ub = session(client)
    assert ua['id'] != ub['id']
    pid = client.get('/api/products').json()[0]['id']
    r = client.post('/api/shopping-lists', headers=ha, json={'name':'Privada','items':[{'product_id':pid,'quantity':2}]})
    assert r.status_code == 201
    lid = r.json()['id']
    assert client.get(f'/api/shopping-lists/{lid}', headers=hb).status_code == 404
    assert client.get(f'/api/comparisons/{lid}', headers=hb).status_code == 404
    assert client.delete(f'/api/shopping-lists/{lid}', headers=hb).status_code == 404
    assert client.get(f'/api/comparisons/{lid}', headers=ha).status_code == 200


def test_real_mode_hides_demo_prices_and_disables_demo_login(client, monkeypatch):
    monkeypatch.setattr(get_settings(), 'demo_mode', False)
    assert client.post('/api/auth/demo-session').status_code == 404
    assert client.get('/api/features').json()['demo_mode'] is False
    rows = client.get('/api/price-reports').json()
    assert all(r['source_type'] != 'development' for r in rows)
    pid = client.get('/api/products', params={'ean':'7890000000011'}).json()[0]['id']
    detail = client.get(f'/api/products/{pid}').json()
    assert all(r['source_type'] != 'development' for r in detail['prices'])


@pytest.mark.parametrize('items', [[], [{'product_id':1,'quantity':1},{'product_id':1,'quantity':2}]])
def test_empty_and_duplicate_lists_rejected(client, items):
    headers, _ = session(client)
    assert client.post('/api/shopping-lists', headers=headers, json={'name':'Lista','items':items}).status_code == 422


def test_verification_is_single_use(client):
    from conftest import VERIFICATIONS
    _, user = register_user(client)
    token = VERIFICATIONS[user['email']]
    assert client.post('/api/auth/verify', json={'token':token}).status_code == 400


@pytest.mark.parametrize('identity,status', [
    ({'id':'abc','email':'pending@teste.local'},403),
    ([],502),
    ({'id':'abc','email':'verified@teste.local','email_confirmed_at':'2026-10-29','user_metadata':{'name':'Verificada'}},200),
])
def test_supabase_exchange_validates_confirmation(client, monkeypatch, identity, status):
    monkeypatch.setattr(get_settings(),'supabase_url','https://example.supabase.co')
    monkeypatch.setattr(get_settings(),'supabase_anon_key','public-test-key')
    @contextmanager
    def upstream(req, timeout):
        assert req.full_url == 'https://example.supabase.co/auth/v1/user'
        assert req.get_header('Authorization') == 'Bearer ' + 'x'*40
        yield io.StringIO(json.dumps(identity))
    monkeypatch.setattr('app.api.supabase_auth.urlopen', upstream)
    r = client.post('/api/auth/supabase-session',json={'access_token':'x'*40})
    assert r.status_code == status
    if status == 200:
        assert client.get('/api/auth/me',headers={'Authorization':'Bearer '+r.json()['access_token']}).status_code == 200


def test_external_ean_import_has_no_invented_price(client, monkeypatch):
    @contextmanager
    def upstream(req, timeout):
        yield io.StringIO(json.dumps({'status':1,'product':{'product_name':'Nutella teste','brands':'Ferrero'}}))
    monkeypatch.setattr('app.api.catalog.urlopen',upstream)
    r = client.get('/api/products',params={'ean':'3017620422003'})
    assert r.status_code == 200
    assert r.json()[0]['min_price'] is None
    assert client.get('/api/products',params={'ean':'3017620422003'}).json()[0]['id'] == r.json()[0]['id']


def test_external_ean_failure_is_controlled(client, monkeypatch):
    def timeout(*args, **kwargs):
        raise TimeoutError()
    monkeypatch.setattr('app.api.catalog.urlopen',timeout)
    assert client.get('/api/products',params={'ean':'1234567890123'}).status_code == 404


def test_production_refuses_insecure_defaults():
    with pytest.raises(ValidationError):
        Settings(_env_file=None,app_env='production')
    with pytest.raises(ValidationError):
        Settings(_env_file=None,app_env='production',secret_key='x'*40,frontend_url='https://example.com')
    cfg = Settings(_env_file=None,app_env='production',secret_key='x'*40,frontend_url='https://example.com',database_url='postgresql://test:test@localhost/test')
    assert cfg.database_url.startswith('postgresql+psycopg://')


def test_seed_does_not_modify_existing_market(client):
    from app.db.init_db import init_db
    from app.models import Market
    with SessionLocal() as db:
        market = db.get(Market,1)
        previous = market.address
        market.address = 'Endereço preservado'
        db.commit()
    init_db()
    with SessionLocal() as db:
        market = db.get(Market,1)
        assert market.address == 'Endereço preservado'
        market.address = previous
        db.commit()


def test_unicode_password_limit(client):
    assert client.post('/api/auth/register',json={'name':'Teste','email':'unicode@teste.local','password':'🔒'*30}).status_code == 422


def test_real_mode_comparison_never_uses_demo_observations(client, monkeypatch):
    headers, _ = register_user(client)
    pid = client.get('/api/products', params={'ean':'7890000000011'}).json()[0]['id']
    created = client.post('/api/shopping-lists', headers=headers, json={'name':'Real','items':[{'product_id':pid,'quantity':1}]}).json()
    demo_headers, _ = session(client)
    monkeypatch.setattr(get_settings(), 'demo_mode', False)
    assert client.get('/api/auth/me', headers=demo_headers).status_code == 401
    response = client.get(f'/api/comparisons/{created["id"]}', headers=headers)
    assert response.status_code == 200
    assert all(i['source_type'] != 'development' for m in response.json()['results'] for i in m['items'])
