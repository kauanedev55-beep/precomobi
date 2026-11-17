import pytest
from sqlalchemy import select,delete
from app.models import PriceConfirmation
from datetime import datetime,timedelta,timezone
from sqlalchemy.orm import Session
from app.db.session import engine
from app.models import Product,Market,PriceReport
from conftest import register_user


def test_community_feed_uses_people_latest_per_store_before_pagination(client):
    headers,user=register_user(client)
    now=datetime.now(timezone.utc)
    with Session(engine) as db:
        product=Product(name='Arroz especial comunidade',brand='Marca Vizinha',image_url='https://example.com/arroz.jpg',is_active=True)
        other=Product(name='Leite especial comunidade',is_active=True)
        inactive=Product(name='Arroz inativo comunidade',is_active=False)
        stores=[Market(name='Loja comunidade '+name,address='Rua 1',city=city,state='ES',is_active=active) for name,city,active in [('A','Serra',True),('B','Serra',True),('C','Vitória',True),('D','Serra',False)]]
        db.add_all([product,other,inactive,*stores]);db.flush()
        pid,mid=product.id,stores[0].id
        def add(p,m,price,when,source='community'):
            r=PriceReport(product_id=p.id,market_id=m.id,user_id=user['id'],price=price,reported_at=when,source_type=source,is_active=True);db.add(r);db.flush();return r.id
        old=add(product,stores[0],4,now-timedelta(days=2))
        newest=add(product,stores[0],5,now-timedelta(days=1))
        second=add(product,stores[1],6,now-timedelta(days=1))
        third=add(other,stores[0],7,now-timedelta(days=1))
        add(product,stores[2],8,now)
        add(product,stores[3],9,now)
        add(inactive,stores[0],10,now)
        official=add(product,stores[0],11,now,'official_flyer')
        db.commit()
    url='/api/price-reports?community_only=true&latest=true&city=Serra&q=especial%20comunidade'
    response=client.get(url,headers=headers)
    assert response.status_code==200,response.text
    rows=response.json()
    assert {r['id'] for r in rows}=={newest,second,third}
    assert old not in {r['id'] for r in rows} and official not in {r['id'] for r in rows}
    rice=next(r for r in rows if r['id']==newest)
    assert rice['image_url']=='https://example.com/arroz.jpg' and rice['market_city']=='Serra'
    assert rice['is_mine'] and rice['source_type']=='community'
    assert len(client.get(url+'&limit=1').json())==1
    pages=[client.get(url+f'&limit=1&offset={i}').json()[0]['id'] for i in range(3)]
    assert len(set(pages))==3 and set(pages)=={newest,second,third}
    scoped=client.get(url+f'&market_id={mid}&product_id={pid}').json()
    assert [r['id'] for r in scoped]==[newest]
    brand=client.get('/api/price-reports?community_only=true&latest=true&q=Marca%20Vizinha&city=Serra').json()
    assert {r['id'] for r in brand}=={newest,second}
    assert all('user_id' not in r and 'email' not in r for r in rows)
    # Default public history remains available and includes past observations.
    history=client.get(f'/api/price-reports?product_id={pid}&market_id={mid}').json()
    assert {r['id'] for r in history}=={old,newest,official}


def test_community_search_treats_wildcards_as_literal_and_validates_paging(client):
    response=client.get('/api/price-reports?community_only=true&q=%25_%25')
    assert response.status_code==200 and response.json()==[]
    assert client.get('/api/price-reports?offset=-1').status_code==422
    assert client.get('/api/price-reports?limit=501').status_code==422


@pytest.fixture(autouse=True)
def cleanup_test_catalog():
    yield
    with Session(engine) as db:
        market_ids=list(db.scalars(select(Market.id).where(Market.name.startswith('Loja comunidade '))))
        report_ids=list(db.scalars(select(PriceReport.id).where(PriceReport.market_id.in_(market_ids))))
        db.execute(delete(PriceConfirmation).where(PriceConfirmation.price_report_id.in_(report_ids)))
        from app.models import Offer
        db.execute(delete(Offer).where(Offer.market_id.in_(market_ids)))
        db.execute(delete(PriceReport).where(PriceReport.market_id.in_(market_ids)))
        db.execute(delete(Market).where(Market.id.in_(market_ids)))
        db.execute(delete(Product).where(Product.name.in_(['Arroz especial comunidade','Leite especial comunidade','Arroz inativo comunidade'])))
        db.commit()
