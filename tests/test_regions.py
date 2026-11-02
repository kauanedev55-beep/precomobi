from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from sqlalchemy import create_engine, delete, func, select
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.session import SessionLocal
from app.db.greater_vitoria_markets import BRANCHES, add_greater_vitoria_markets
from app.models import Market, Offer, OfferCheck, PriceReport, ShoppingList, ShoppingListItem
from conftest import register_user


@pytest.fixture
def region_data(client, demo_headers):
    with SessionLocal() as db:
        stores = [Market(name=name, address='Endereço de teste', city=city, state=state, is_active=active)
            for name,city,state,active in [('Teste VV A','Vila Velha','ES',True),('Teste VV B','Vila Velha','ES',True),('Teste Vitória','Vitória','ES',True),('Teste fora ES','Vitória','BA',True),('Teste inativo','Vila Velha','ES',False)]]
        db.add_all(stores);db.flush()
        ids = [m.id for m in stores]
        user_id = client.get('/api/auth/me',headers=demo_headers).json()['id']
        for mid,pid,price in [(ids[0],1,'10'),(ids[0],2,'20'),(ids[1],1,'12'),(ids[2],2,'1'),(ids[3],1,'0.01'),(ids[4],1,'0.50')]:
            db.add(PriceReport(product_id=pid,market_id=mid,user_id=user_id,price=Decimal(price),source_type='community'))
        db.commit()
    created=client.post('/api/shopping-lists',headers=demo_headers,json={'name':'Lista regional','items':[{'product_id':1,'quantity':1},{'product_id':2,'quantity':1}]}).json()
    yield ids,created['id']
    with SessionLocal() as db:
        offers = list(db.scalars(select(Offer.id).where(Offer.market_id.in_(ids))))
        db.execute(delete(OfferCheck).where(OfferCheck.offer_id.in_(offers)))
        db.execute(delete(Offer).where(Offer.market_id.in_(ids)))
        db.execute(delete(PriceReport).where(PriceReport.market_id.in_(ids)))
        db.execute(delete(ShoppingListItem).where(ShoppingListItem.shopping_list_id==created['id']))
        db.execute(delete(ShoppingList).where(ShoppingList.id==created['id']))
        db.execute(delete(Market).where(Market.id.in_(ids)));db.commit()


def test_market_city_accents_state_and_inactive(client, region_data):
    ids,_=region_data
    rows=client.get('/api/markets',params={'city':'  VITORIA  '}).json()
    assert {m['id'] for m in rows}=={ids[2]}
    assert {m['id'] for m in client.get('/api/markets?city=Vila%20Velha').json()}==set(ids[:2])
    assert client.get('/api/markets?city=Inexistente').json()==[]
    assert ids[3] not in {m['id'] for m in client.get('/api/markets?city=*').json()}
    assert client.get('/api/markets?city=').status_code==422


def test_comparison_city_recomputes_shared_products_and_ranking(client, demo_headers, region_data):
    ids,lid=region_data
    r=client.get(f'/api/comparisons/{lid}?city=Vila%20Velha',headers=demo_headers)
    assert r.status_code==200,r.text
    body=r.json()
    assert {m['market_id'] for m in body['results']}==set(ids[:2])
    assert body['common_product_ids']==[1] and body['priced_markets_count']==2
    a,b=body['results']
    assert a['complete'] and Decimal(a['total'])==Decimal('30.00')
    assert not b['complete'] and b['total'] is None
    assert Decimal(a['comparable_total'])==Decimal('10.00') and Decimal(b['comparable_total'])==Decimal('12.00')
    all_cities=client.get(f'/api/comparisons/{lid}?city=*',headers=demo_headers).json()
    assert all_cities['common_product_ids']==[]
    empty=client.get(f'/api/comparisons/{lid}?city=Inexistente',headers=demo_headers).json()
    assert empty['results']==[] and empty['common_items_count']==0 and empty['priced_markets_count']==0


def test_city_cannot_reveal_another_users_list(client, demo_headers, region_data):
    _,lid=region_data
    other,_=register_user(client)
    assert client.get(f'/api/comparisons/{lid}?city=Vila%20Velha',headers=other).status_code==404
    assert client.get(f'/api/comparisons/{lid}?city=Vila%20Velha').status_code==401


def test_history_filters_before_limit(client,region_data):
    ids,_=region_data
    rows=client.get('/api/price-reports',params={'city':'vitoria','limit':1}).json()
    assert len(rows)==1 and rows[0]['market_id']==ids[2]
    assert client.get('/api/price-reports',params={'city':'vitoria','market_id':ids[0]}).json()==[]


def test_offers_city_filters_before_limit_and_personal_matching(client,demo_headers,region_data):
    ids,_=region_data
    for mid in [ids[0],ids[2]]:
        r=client.post('/api/offers',headers=demo_headers,json={'product_id':1,'market_id':mid,'price':'9.50','conditions':'Preço para todos','expires_at':(datetime.now(timezone.utc)+timedelta(days=1)).isoformat()})
        assert r.status_code==201,r.text
    rows=client.get('/api/offers?city=Vila%20Velha&for_my_lists=true',headers=demo_headers).json()
    assert len(rows)==1 and rows[0]['market']['id']==ids[0]
    rows=client.get('/api/offers?city=vitoria',headers=demo_headers).json()
    assert len(rows)==1 and rows[0]['market']['id']==ids[2]


def test_greater_vitoria_import_is_additive_idempotent_and_has_no_prices(tmp_path):
    engine=create_engine(f"sqlite:///{tmp_path / 'branches.db'}")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        old=Market(**{**BRANCHES[0],'address':'Endereço administrativo preservado'},is_active=False)
        db.add(old);db.commit();old_id=old.id
    add_greater_vitoria_markets(engine)
    with Session(engine) as db:
        stores=list(db.scalars(select(Market)))
        assert len(stores)==6
        old=db.get(Market,old_id)
        assert not old.is_active and old.address=='Endereço administrativo preservado'
        assert all(m.latitude is None and m.longitude is None for m in stores)
        assert db.scalar(select(func.count()).select_from(PriceReport))==0
        old.name='Nome editado pela administradora';db.commit()
    add_greater_vitoria_markets(engine)
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(Market))==6
        assert db.get(Market,old_id).name=='Nome editado pela administradora'
    engine.dispose()


def test_product_catalog_and_details_use_local_prices_without_hiding_products(client,region_data):
    ids,_=region_data
    all_products=client.get('/api/products').json()
    vv=client.get('/api/products?city=Vila%20Velha').json()
    assert {p['id'] for p in vv}=={p['id'] for p in all_products}
    rice=next(p for p in vv if p['id']==1)
    assert Decimal(rice['min_price'])==Decimal('10.00')
    detail=client.get('/api/products/1?city=Vila%20Velha').json()
    assert {p['market_id'] for p in detail['prices']}==set(ids[:2])
    assert Decimal(detail['min_price'])==Decimal('10.00')
    detail=client.get('/api/products/1?city=vitoria').json()
    assert detail['min_price'] is None and len(detail['prices'])==1
    assert detail['prices'][0]['market_id']==ids[2] and detail['prices'][0]['price'] is None
