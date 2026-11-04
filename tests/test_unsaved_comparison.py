from decimal import Decimal

from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session
from app.db.base import Base
from app.db.session import SessionLocal
from app.db.cariacica_markets import BRANCHES, add_cariacica_markets
from app.models import Market, Offer, PriceReport, Product, ShoppingList, ShoppingListItem
from conftest import register_user

PAYLOAD={'name':'Compra sem salvar','items':[{'product_id':1,'quantity':2},{'product_id':2,'quantity':1}]}


def counts():
    with SessionLocal() as db:
        return {m.__tablename__: db.scalar(select(func.count()).select_from(m))
            for m in [ShoppingList,ShoppingListItem,Product,PriceReport,Offer]}


def test_preview_uses_same_prices_as_saved_list_without_creating_any_records(client,demo_headers):
    before=counts()
    preview=client.post('/api/comparisons/preview?city=Serra',headers=demo_headers,json=PAYLOAD)
    assert preview.status_code==200,preview.text
    body=preview.json()
    assert body['shopping_list_id'] is None and body['list_name']==PAYLOAD['name']
    assert body['results'] and all(m['city']=='Serra' for m in body['results'])
    assert counts()==before
    again=client.post('/api/comparisons/preview?city=Serra',headers=demo_headers,json=PAYLOAD)
    assert again.json()==body and counts()==before
    saved=client.post('/api/shopping-lists',headers=demo_headers,json=PAYLOAD)
    assert saved.status_code==201,saved.text
    result=client.get(f"/api/comparisons/{saved.json()['id']}?city=Serra",headers=demo_headers).json()
    assert result['results']==body['results']
    assert result['common_product_ids']==body['common_product_ids']
    assert counts()['shopping_lists']==before['shopping_lists']+1


def test_unsaved_preview_is_authenticated_and_validates_items(client,demo_headers):
    before=counts()
    assert client.post('/api/comparisons/preview?city=Serra',json=PAYLOAD).status_code==401
    for items in [[],[{'product_id':1,'quantity':0}],[{'product_id':1,'quantity':1},{'product_id':1,'quantity':1}]]:
        r=client.post('/api/comparisons/preview?city=Serra',headers=demo_headers,json={**PAYLOAD,'items':items})
        assert r.status_code==422,r.text
    missing=client.post('/api/comparisons/preview',headers=demo_headers,json={**PAYLOAD,'items':[{'product_id':99999999,'quantity':1}]})
    assert missing.status_code==404 and counts()==before


def test_preview_does_not_expose_other_users_private_lists(client,demo_headers):
    saved=client.post('/api/shopping-lists',headers=demo_headers,json=PAYLOAD).json()
    other,_=register_user(client)
    before=counts()
    assert client.get(f"/api/comparisons/{saved['id']}",headers=other).status_code==404
    own=client.post('/api/comparisons/preview?city=Serra',headers=other,json=PAYLOAD)
    assert own.status_code==200 and own.json()['shopping_list_id'] is None
    assert client.get('/api/shopping-lists',headers=other).json()==[]
    assert counts()==before


def test_empty_city_result_has_no_fake_totals_and_does_not_save(client,demo_headers):
    before=counts()
    r=client.post('/api/comparisons/preview?city=Cidade%20sem%20mercados',headers=demo_headers,json=PAYLOAD)
    assert r.status_code==200
    assert r.json()['results']==[] and r.json()['priced_markets_count']==0
    assert counts()==before


def test_cariacica_import_is_additive_idempotent_and_has_no_prices(tmp_path):
    engine=create_engine(f"sqlite:///{tmp_path / 'cariacica.db'}")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        old=Market(**{**BRANCHES[0],'address':'Endereço editado pela administradora'},is_active=False)
        db.add(old);db.commit();oid=old.id
    add_cariacica_markets(engine)
    with Session(engine) as db:
        stores=list(db.scalars(select(Market)))
        assert len(stores)==3 and all(m.city=='Cariacica' for m in stores)
        old=db.get(Market,oid)
        assert not old.is_active and old.address=='Endereço editado pela administradora'
        assert all(m.latitude is None and m.longitude is None for m in stores)
        assert db.scalar(select(func.count()).select_from(PriceReport))==0
        old.name='Nome alterado depois';db.commit()
    add_cariacica_markets(engine)
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(Market))==3
        assert db.get(Market,oid).name=='Nome alterado depois'
    engine.dispose()


def test_preview_default_and_fractional_quantities_match_saved_precision(client,demo_headers):
    for item in [{'product_id':1}, {'product_id':1,'quantity':'0.125'}]:
        payload={'name':'Quantidade válida','items':[item]}
        preview=client.post('/api/comparisons/preview?city=Serra',headers=demo_headers,json=payload)
        assert preview.status_code==200,preview.text
        saved=client.post('/api/shopping-lists',headers=demo_headers,json=payload)
        assert saved.status_code==201,saved.text
        result=client.get(f"/api/comparisons/{saved.json()['id']}?city=Serra",headers=demo_headers).json()
        assert result['results']==preview.json()['results']
    before=counts()
    bad={'name':'Precisão inválida','items':[{'product_id':1,'quantity':'0.0001'}]}
    assert client.post('/api/comparisons/preview',headers=demo_headers,json=bad).status_code==422
    assert client.post('/api/shopping-lists',headers=demo_headers,json=bad).status_code==422
    assert counts()==before
