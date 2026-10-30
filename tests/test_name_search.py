import io
import json
from contextlib import contextmanager
from urllib.parse import parse_qs, urlsplit

import pytest
from sqlalchemy import select

from app.api import catalog
from app.db.session import SessionLocal
from app.models import Product


@pytest.fixture(autouse=True)
def clear_search_state():
    catalog._search_cache.clear()
    catalog._search_requests.clear()
    yield
    catalog._search_cache.clear()
    catalog._search_requests.clear()


def test_name_search_imports_without_prices_and_reuses_local(client, monkeypatch):
    calls = []

    @contextmanager
    def upstream(req, timeout):
        calls.append(req.full_url)
        assert urlsplit(req.full_url).netloc == 'search.openfoodfacts.org'
        assert parse_qs(urlsplit(req.full_url).query)['q'] == ['Biscoito integração']
        assert parse_qs(urlsplit(req.full_url).query)['langs'] == ['pt,en']
        yield io.StringIO(json.dumps({'hits': [
            {'code': '7891234567801', 'product_name_pt': 'Biscoito integração', 'brands': ['Marca']},
            {'code': '7891234567801', 'product_name': 'Duplicado'},
            {'code': 'invalid', 'product_name': 'Inválido'},
            {'code': '7891234567802', 'product_name': []},
        ]}))

    monkeypatch.setattr(catalog, 'urlopen', upstream)
    rows = client.get('/api/products', params={'q': 'Biscoito integração'}).json()
    assert len(rows) == 1
    assert rows[0]['name'] == 'Biscoito integração'
    assert rows[0]['brand'] == 'Marca'
    assert rows[0]['min_price'] is None
    assert client.get('/api/products', params={'q': 'Biscoito integração'}).json()[0]['id'] == rows[0]['id']
    assert len(calls) == 1


def test_local_search_and_short_terms_never_call_external(client, monkeypatch):
    def unexpected(*args, **kwargs):
        pytest.fail('Local catalog must remain available without upstream')
    monkeypatch.setattr(catalog, 'urlopen', unexpected)
    assert client.get('/api/products', params={'q': 'Camil'}).json()
    assert client.get('/api/products', params={'q': 'zz'}).json() == []
    assert client.get('/api/products').status_code == 200


def test_external_failures_are_explicit_and_do_not_change_catalog(client, monkeypatch):
    with SessionLocal() as db:
        before = list(db.scalars(select(Product.id)))
    def unavailable(*args, **kwargs):
        raise TimeoutError()
    monkeypatch.setattr(catalog, 'urlopen', unavailable)
    r = client.get('/api/products', params={'q': 'Nunca encontrado timeout'})
    assert r.status_code == 503
    assert 'indisponível' in r.json()['detail']
    with SessionLocal() as db:
        assert list(db.scalars(select(Product.id))) == before


def test_empty_search_is_cached_and_limit_is_enforced(monkeypatch):
    calls = []
    @contextmanager
    def upstream(req, timeout):
        calls.append(req.full_url)
        yield io.StringIO('{"hits": []}')
    monkeypatch.setattr(catalog, 'urlopen', upstream)
    assert catalog._search_external_products('Sem resultados') == []
    assert catalog._search_external_products('sem resultados') == []
    assert len(calls) == 1
    for n in range(7):
        catalog._search_external_products(f'Outro {n}')
    with pytest.raises(catalog.HTTPException) as exc:
        catalog._search_external_products('Limite')
    assert exc.value.status_code == 429
    assert len(calls) == 8
