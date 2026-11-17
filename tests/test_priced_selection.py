import pytest
from sqlalchemy import select,delete
from app.models import PriceConfirmation
from datetime import datetime,timedelta,timezone
from sqlalchemy.orm import Session
from app.db.session import engine
from app.models import Product,Market,PriceReport,Offer
from app.core.config import get_settings
from conftest import register_user


def test_search_markets_and_comparison_only_use_available_real_prices(client,monkeypatch):
    headers,user=register_user(client)
    monkeypatch.setattr(get_settings(),'demo_mode',False)
    now=datetime.now(timezone.utc)
    with Session(engine) as db:
        products=[Product(name='Produto apresentação '+str(i),is_active=True,is_standard=i==0) for i in range(4)]
        markets=[Market(name='Mercado apresentação '+str(i),address='Rua de teste',city='Cidade Teste',state='ES',is_active=True) for i in range(4)]
        db.add_all(products+markets);db.flush()
        pids=[p.id for p in products];mids=[m.id for m in markets]
        def price(p,m,value,source='official_flyer',expired=False):
            db.add(PriceReport(product_id=pids[p],market_id=mids[m],user_id=user['id'],price=value,source_type=source,is_active=True,expires_at=now+timedelta(days=-1 if expired else 1),source_url='https://example.com/folheto'))
        price(0,0,10);price(0,1,12);price(1,0,20)
        price(2,2,1,expired=True);price(3,3,1,source='development')
        db.add(Offer(product_id=pids[0],market_id=mids[0],user_id=user['id'],price=9,conditions='Exige clube; sem clube 10',observed_at=now,expires_at=now+timedelta(days=1)))
        db.commit()
    scoped=client.get('/api/products',params={'priced':True,'city':'Cidade Teste','external':False}).json()
    assert {p['id'] for p in scoped}==set(pids[:2])
    assert all(p['min_price'] is not None for p in scoped)
    stores=client.get('/api/markets?priced=true&city=Cidade%20Teste').json()
    assert {m['id'] for m in stores}==set(mids[:2])
    offers=client.get('/api/markets?with_offers=true&city=Cidade%20Teste').json()
    assert [m['id'] for m in offers]==[mids[0]]
    all_stores=client.get('/api/markets?city=Cidade%20Teste').json()
    assert {m['id'] for m in all_stores}==set(mids)
    assert client.get('/api/products?priced=true&city=Outra&external=false').json()==[]
    payload={'name':'Compra real','items':[{'product_id':pids[0],'quantity':'2'}]}
    result=client.post('/api/comparisons/preview?city=Cidade%20Teste',headers=headers,json=payload).json()
    priced=[r for r in result['results'] if r['found_items']>0]
    assert [r['market_id'] for r in priced]==mids[:2]
    assert [r['total'] for r in priced]==['20.00','24.00']
    assert result['excluded_markets_count']==2
    assert all(r['complete'] and r['items'][0]['source_type']=='official_flyer' for r in priced)
    payload['items'].append({'product_id':pids[1],'quantity':'1'})
    partial=client.post('/api/comparisons/preview?city=Cidade%20Teste',headers=headers,json=payload).json()
    assert partial['results'][0]['complete']
    assert partial['results'][1]['total'] is None and partial['results'][1]['found_items']==1


@pytest.fixture(autouse=True)
def cleanup_test_catalog():
    yield
    with Session(engine) as db:
        market_ids=list(db.scalars(select(Market.id).where(Market.name.startswith('Mercado apresentação '))))
        report_ids=list(db.scalars(select(PriceReport.id).where(PriceReport.market_id.in_(market_ids))))
        db.execute(delete(PriceConfirmation).where(PriceConfirmation.price_report_id.in_(report_ids)))
        from app.models import Offer
        db.execute(delete(Offer).where(Offer.market_id.in_(market_ids)))
        db.execute(delete(PriceReport).where(PriceReport.market_id.in_(market_ids)))
        db.execute(delete(Market).where(Market.id.in_(market_ids)))
        db.execute(delete(Product).where(Product.name.startswith('Produto apresentação ')))
        db.commit()
