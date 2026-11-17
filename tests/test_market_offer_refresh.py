import json
from datetime import datetime,timezone
from pathlib import Path
from decimal import Decimal
from sqlalchemy import create_engine,select,func
from sqlalchemy.orm import Session
from app.db.base import Base
from app.db.official_flyers import seed_official_market_refresh
from app.models import Market,Product,PriceReport,Offer

def test_new_flyers_respect_excluded_stores_region_units_and_retry(tmp_path):
    entries=json.loads((Path(__file__).resolve().parents[1]/'backend/app/db/official_flyers_market_refresh.json').read_text())
    assert len(entries)==15
    engine=create_engine(f"sqlite:///{tmp_path/'refresh.db'}");Base.metadata.create_all(engine)
    with Session(engine) as db:
        for e in {e['product_source_url']:e for e in entries}.values():db.add(Product(name=e['product_name'],catalog_source_url=e['product_source_url'],sale_unit=e['sale_unit'],is_active=True))
        for name,city,state in [('Extrabom Colina de Laranjeiras','Serra','ES'),('Extrabom Feu Rosa','Serra','ES'),('Extrabom Serra Centro','Serra','ES'),('Extrabom Serra Dourada','Serra','ES'),('Supermercados BH Laranjeiras','Serra','ES'),('Supermercados BH Fora','Fora','MG'),('Carone Laranjeiras','Serra','ES')]:db.add(Market(name=name,address='Rua de teste',city=city,state=state))
        db.commit()
    now=datetime(2026,11,18,12,tzinfo=timezone.utc)
    seed_official_market_refresh(engine,now);seed_official_market_refresh(engine,now)
    with Session(engine) as db:
        reports=list(db.scalars(select(PriceReport)))
        assert len(reports)==15 and db.scalar(select(func.count()).select_from(Offer))==15
        assert {r.market.name for r in reports}=={'Extrabom Colina de Laranjeiras','Supermercados BH Laranjeiras'}
        assert all(r.expires_at and r.source_url for r in reports)
        rice=db.scalar(select(Product).where(Product.name=='Arroz Tipo 1 Sepé Bianco 5Kg'))
        shelf=db.scalar(select(PriceReport).where(PriceReport.product_id==rice.id))
        promo=db.scalar(select(Offer).where(Offer.product_id==rice.id))
        assert shelf.price==Decimal('21.98') and promo.price==Decimal('19.98')
        ham=db.scalar(select(Product).where(Product.name=='Presunto Cozido Tradicional Perdigão Peça (por quilo)'))
        price=db.scalar(select(PriceReport).where(PriceReport.product_id==ham.id))
        assert ham.sale_unit=='kg' and price.price==Decimal('24.90')
    engine.dispose()
