from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine, delete, select, func
from sqlalchemy.dialects import postgresql

from app.db.session import SessionLocal
from app.models import Offer, OfferCheck, PriceReport, Product, Market
from conftest import register_user
from app.db.base import Base


@pytest.fixture(autouse=True)
def isolate_offers(client):
    yield
    with SessionLocal() as db:
        db.execute(delete(OfferCheck))
        db.execute(delete(Offer))
        db.commit()


@pytest.fixture
def actors(client):
    a, _ = register_user(client)
    b, _ = register_user(client)
    return a, b


def publish(client, actor, **changes):
    payload = dict(product_id=1, market_id=1, price="4.50", conditions="Exige clube da loja e três unidades",
        expires_at=(datetime.now(timezone.utc)+timedelta(days=2)).isoformat())
    payload.update(changes)
    return client.post('/api/offers', headers=actor, json=payload)


def test_offer_lifecycle_and_per_user_checks(client, actors):
    a,b=actors
    r=publish(client,a)
    assert r.status_code==201, r.text
    offer=r.json()
    oid=offer['id']
    assert offer['is_mine'] and offer['confirmations']==0
    assert not {'user_id','email','user','shopping_lists'} & offer.keys()
    assert client.post(f'/api/offers/{oid}/check',headers=a,json={'status':'confirmed'}).status_code==400
    confirmed=client.post(f'/api/offers/{oid}/check',headers=b,json={'status':'confirmed'})
    assert confirmed.status_code==200, confirmed.text
    assert confirmed.json()['confirmations']==1 and not confirmed.json()['is_mine']
    assert client.post(f'/api/offers/{oid}/check',headers=b,json={'status':'confirmed'}).json()['confirmations']==1
    assert client.post(f'/api/offers/{oid}/check',headers=b,json={'status':'changed'}).status_code==422
    changed=client.post(f'/api/offers/{oid}/check',headers=b,json={'status':'changed','observed_price':'5.25'}).json()
    assert changed['changed_reports']==1 and changed['confirmations']==0
    assert changed['price']=='4.50'  # Warning never rewrites the author's observation.
    assert client.post(f'/api/offers/{oid}/check',headers=b,json={'status':'ended'}).json()['ended_reports']==1
    assert client.post(f'/api/offers/{oid}/end',headers=b).status_code==404
    assert client.post(f'/api/offers/{oid}/end',headers=a).json()['state']=='ended'
    assert client.get('/api/offers',headers=b).json()==[]
    assert client.get('/api/offers?mine=true',headers=b).json()==[]
    assert client.get('/api/offers?mine=true',headers=a).json()[0]['state']=='ended'
    assert client.post(f'/api/offers/{oid}/check',headers=b,json={'status':'confirmed'}).status_code==409


def test_alerts_match_only_own_saved_lists_and_explicit_draft_products(client, actors):
    a,b=actors
    r=publish(client,b)
    assert r.status_code==201
    oid=r.json()['id']
    saved=client.post('/api/shopping-lists',headers=a,json={'name':'Privada para ofertas','items':[{'product_id':1,'quantity':1}]})
    assert saved.status_code==201
    assert oid in [o['id'] for o in client.get('/api/offers?for_my_lists=true',headers=a).json()]
    assert client.get('/api/offers?for_my_lists=true',headers=b).json()==[]
    assert oid in [o['id'] for o in client.get('/api/offers?for_my_lists=true&product_ids=1',headers=b).json()]
    assert client.get('/api/offers?product_ids=0,wrong',headers=b).status_code==422
    assert client.get('/api/offers?for_my_lists=true').status_code==401


def test_expired_offers_hidden_without_deleting_and_do_not_reprice_baskets(client, actors):
    a,b=actors
    with SessionLocal() as db:
        before=db.scalar(select(func.count()).select_from(PriceReport))
    oid=publish(client,a).json()['id']
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(PriceReport))==before
        o=db.get(Offer,oid)
        o.expires_at=datetime.now(timezone.utc)-timedelta(seconds=1)
        db.commit()
    assert client.get('/api/offers',headers=b).json()==[]
    assert client.get('/api/offers?mine=true',headers=a).json()[0]['state']=='expired'
    assert client.post(f'/api/offers/{oid}/check',headers=b,json={'status':'confirmed'}).status_code==409


@pytest.mark.parametrize('changes',[
    {'price':'0'},{'conditions':'   '},{'product_id':999999},{'market_id':999999},
    {'expires_at':'2020-01-01T00:00:00Z'}, {'observed_at':'2999-01-01T00:00:00Z'},
])
def test_invalid_offers_rejected(client, actors, changes):
    assert publish(client,actors[0],**changes).status_code in (404,422)


def test_writes_require_session(client):
    assert publish(client,{}).status_code==401
    assert client.post('/api/offers/999/check',json={'status':'confirmed'}).status_code==401
    assert client.post('/api/offers/999/end').status_code==401


def test_postgres_locks_only_offer_table_with_joined_details():
    from app.api.offers import base_query
    sql=str(base_query().where(Offer.id==1).with_for_update(of=Offer).compile(dialect=postgresql.dialect()))
    assert 'FOR UPDATE OF offers' in sql


def test_schema_upgrade_keeps_existing_catalog_and_adds_empty_offer_tables(tmp_path):
    from sqlalchemy.orm import Session
    engine=create_engine(f"sqlite:///{tmp_path / 'legacy-upgrade.db'}")
    old_tables=[t for t in Base.metadata.sorted_tables if t.name not in {'offers','offer_checks'}]
    Base.metadata.create_all(engine,tables=old_tables)
    with Session(engine) as db:
        db.add(Product(id=73,name='Produto existente',ean='3017620422003'))
        db.add(Market(id=81,name='Mercado existente',address='Endereço preservado',city='Serra',state='ES'))
        db.commit()
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        assert db.get(Product,73).name=='Produto existente'
        assert db.get(Market,81).address=='Endereço preservado'
        assert db.scalar(select(func.count()).select_from(Offer))==0
        assert db.scalar(select(func.count()).select_from(OfferCheck))==0
    engine.dispose()
