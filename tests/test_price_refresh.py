"""A new edition feeds the list with store prices, independently from club offers."""
import json
from pathlib import Path
from datetime import datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from sqlalchemy import create_engine, select, func
from sqlalchemy.orm import Session
from app.db.base import Base
from app.db.official_flyers import seed_official_flyers, seed_official_flyers_nov12
from app.models import Product, Market, PriceReport
from app.models.offers import Offer
from app.api.comparisons import build_comparison

NOW=datetime(2026,11,12,20,tzinfo=timezone.utc)
ROOT=Path(__file__).resolve().parents[1]/'backend/app/db'

def test_new_edition_preserves_history_and_prices_each_chain_separately(tmp_path):
    entries=json.loads((ROOT/'official_flyers_20261112.json').read_text())
    previous=json.loads((ROOT/'official_flyers_20261107.json').read_text())
    mini=next(e for e in previous if e['market_prefix']=='Carone' and 'Mini Chicken' in e['product_name'])
    engine=create_engine(f"sqlite:///{tmp_path/'editions.db'}");Base.metadata.create_all(engine)
    sources={e['product_source_url']:e for e in [*entries,mini]}
    with Session(engine) as db:
        for url,e in sources.items():db.add(Product(name=e['product_name'],catalog_source_url=url,sale_unit=e['sale_unit'],is_active=True))
        for prefix,city,state in [('Carone','Serra','ES'),('Sempretem','Serra','ES'),('Supermercados BH','Serra','ES'),('Sempretem','Vitória','ES'),('Sempretem','Fora','MG')]:
            db.add(Market(name=prefix+' '+city,address='Endereço da unidade',city=city,state=state))
        db.commit()
    seed_official_flyers(engine,[mini],NOW)
    seed_official_flyers_nov12(engine,NOW);seed_official_flyers_nov12(engine,NOW)
    with Session(engine) as db:
        # The old marker does not prevent a new edition; two runs never duplicate.
        assert db.scalar(select(func.count()).select_from(Offer))==16
        assert db.scalar(select(func.count()).select_from(PriceReport))==16
        p=db.scalar(select(Product).where(Product.catalog_source_url==mini['product_source_url']))
        draft=SimpleNamespace(id=None,name='Teste de compra',items=[SimpleNamespace(product_id=p.id,quantity=Decimal('2'),product=p)])
        result=build_comparison(db,draft,'Serra')
        rows={r['market_name']:r for r in result['results']}
        assert rows['Sempretem Serra']['total']==Decimal('31.96')
        assert rows['Carone Serra']['total']==Decimal('43.98')
        assert rows['Supermercados BH Serra']['total'] is None
        assert len(rows)==3
        # Price on the shelf, not the restricted club offer, goes into the list.
        arroz=db.scalar(select(Product).where(Product.name.like('Arroz Tipo 1 Polido Alegre%')))
        report=db.scalar(select(PriceReport).where(PriceReport.product_id==arroz.id))
        offer=db.scalar(select(Offer).where(Offer.product_id==arroz.id))
        assert report.price==Decimal('19.59') and offer.price==Decimal('17.99')
        assert report.expires_at and report.source_url==offer.source_url
        assert all(r.market_id != db.scalar(select(Market.id).where(Market.city=='Fora')) for r in db.scalars(select(PriceReport)))
    engine.dispose()


def test_partial_results_rank_coverage_without_claiming_cheapest_total(tmp_path):
    engine=create_engine(f"sqlite:///{tmp_path/'coverage.db'}");Base.metadata.create_all(engine)
    with Session(engine) as db:
        products=[Product(name='Produto '+str(i),sale_unit='unit') for i in range(3)]
        a=Market(name='A com poucos preços',address='Rua A',city='Serra',state='ES')
        b=Market(name='B com mais preços',address='Rua B',city='Serra',state='ES')
        db.add_all([*products,a,b]);db.flush()
        db.add(PriceReport(product_id=products[0].id,market_id=a.id,price=Decimal('1'),source_type='community'))
        for p in products[:2]:db.add(PriceReport(product_id=p.id,market_id=b.id,price=Decimal('10'),source_type='community'))
        db.flush()
        draft=SimpleNamespace(id=None,name='Teste',items=[SimpleNamespace(product_id=p.id,quantity=Decimal('1'),product=p) for p in products])
        result=build_comparison(db,draft,'Serra')
        assert [r['found_items'] for r in result['results']]==[2,1]
        assert all(r['total'] is None for r in result['results'])
        assert all(not r['complete'] for r in result['results'])
    engine.dispose()
