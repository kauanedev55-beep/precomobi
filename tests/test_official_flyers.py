from datetime import datetime,timedelta,timezone
from decimal import Decimal
from types import SimpleNamespace
from sqlalchemy import create_engine,select,func
from sqlalchemy.orm import Session
from app.db.base import Base
from app.db.official_flyers import seed_official_flyers
from app.models import Product,Market,PriceReport,User
from app.models.offers import Offer
from app.api.comparisons import build_comparison


def test_reviewed_prices_preserve_observations_scope_and_club_separation(tmp_path):
    engine=create_engine(f"sqlite:///{tmp_path/'flyers.db'}");Base.metadata.create_all(engine)
    now=datetime.now(timezone.utc);start=now-timedelta(days=1);end=now+timedelta(days=3)
    with Session(engine) as db:
        product=Product(name='Produto exato 500g',brand='Marca',sale_unit='unit',catalog_source_url='https://www.extrabom.com.br/p/teste/1/')
        a=Market(name='Extrabom Loja A',address='Rua A',city='Serra',state='ES')
        b=Market(name='Extrabom Feu Rosa',address='Rua B',city='Serra',state='ES')
        c=Market(name='Extrabom Loja C',address='Rua C',city='Cidade fora',state='MG')
        db.add_all([product,a,b,c]);db.flush();pid=product.id;mid=a.id
        original=PriceReport(product_id=pid,market_id=mid,price=Decimal('8.50'),reported_at=now,source_type='community',notes='Conferido na loja')
        db.add(original);db.commit();rid=original.id
    entry=dict(product_source_url='https://www.extrabom.com.br/p/teste/1/',sale_unit='unit',market_prefix='Extrabom',excluded_markets=['Extrabom Feu Rosa'],club_price='5.99',regular_price='9.99',club_name='Clube Extrabom',valid_from=start.isoformat(),valid_until=end.isoformat(),source_url='https://www.extrabom.com.br/lojas/folheto/',source_label='Folheto oficial',conditions='Enquanto durarem os estoques.')
    seed_official_flyers(engine,[entry],now);seed_official_flyers(engine,[entry],now)
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(Offer))==1
        offer=db.scalar(select(Offer));assert offer.price==Decimal('5.99') and 'Exige Clube' in offer.conditions
        reports=list(db.scalars(select(PriceReport).order_by(PriceReport.id)))
        assert len(reports)==2 and reports[1].price==Decimal('9.99') and reports[1].market_id==mid
        assert reports[1].expires_at is not None and reports[1].source_type=='official_flyer'
        assert db.get(PriceReport,rid).notes=='Conferido na loja'
        actor=db.scalar(select(User));assert not actor.is_active
        draft=SimpleNamespace(id=None,name='Minha compra',items=[SimpleNamespace(product_id=pid,quantity=Decimal('2'),product=db.get(Product,pid))])
        result=build_comparison(db,draft,'Serra')
        assert next(r for r in result['results'] if r['market_id']==mid)['total']==Decimal('17.00')
    engine.dispose()


def test_expired_and_future_editions_are_never_seeded(tmp_path):
    engine=create_engine(f"sqlite:///{tmp_path/'dates.db'}");Base.metadata.create_all(engine)
    now=datetime.now(timezone.utc)
    entries=[{'valid_from':(now-timedelta(days=3)).isoformat(),'valid_until':(now-timedelta(days=1)).isoformat()},{'valid_from':(now+timedelta(days=1)).isoformat(),'valid_until':(now+timedelta(days=2)).isoformat()}]
    seed_official_flyers(engine,entries,now)
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(Offer))==0
        assert db.scalar(select(func.count()).select_from(PriceReport))==0
    engine.dispose()


def test_expired_flyer_does_not_participate_in_totals_or_product_search(client):
    from app.db.session import SessionLocal
    now=datetime.now(timezone.utc)
    with SessionLocal() as db:
        p=Product(name='Produto de validade controlada',sale_unit='unit',is_standard=True,is_active=True)
        market=Market(name='Loja validade controlada',address='Rua de teste',city='Serra',state='ES')
        db.add_all([p,market]);db.flush();pid=p.id;mid=market.id
        expired=PriceReport(product_id=pid,market_id=mid,price=Decimal('0.01'),source_type='official_flyer',reported_at=now,expires_at=now-timedelta(seconds=10))
        db.add(expired);db.commit()
        draft=SimpleNamespace(id=None,name='Teste',items=[SimpleNamespace(product_id=pid,quantity=Decimal('1'),product=p)])
        row=next(r for r in build_comparison(db,draft,'Serra')['results'] if r['market_id']==mid)
        assert row['total'] is None and row['items'][0]['unit_price'] is None
    try:
        rows=client.get('/api/products',params={'q':'Produto de validade controlada','external':False,'city':'Serra'}).json()
        assert len(rows)==1 and rows[0]['min_price'] is None
        detail=client.get(f'/api/products/{pid}?city=Serra').json()
        assert next(r for r in detail['prices'] if r['market_id']==mid)['price'] is None
        with SessionLocal() as db:
            db.add(PriceReport(product_id=pid,market_id=mid,price=Decimal('9.99'),source_type='official_flyer',reported_at=now-timedelta(hours=1),expires_at=now+timedelta(days=1),source_url='https://www.extrabom.com.br/lojas/folheto/'));db.commit()
        active=client.get('/api/products',params={'q':'Produto de validade controlada','external':False,'city':'Serra'}).json()[0]
        assert float(active['min_price'])==9.99 and active['min_price_expires_at'] and active['min_price_source_url'].startswith('https://www.extrabom.com.br/')
    finally:
        with SessionLocal() as db:
            from sqlalchemy import delete
            db.execute(delete(PriceReport).where(PriceReport.product_id==pid));db.execute(delete(Product).where(Product.id==pid));db.execute(delete(Market).where(Market.id==mid));db.commit()
