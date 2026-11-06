import json
from decimal import Decimal
from pathlib import Path
from sqlalchemy import create_engine, select, func, delete, text
from sqlalchemy.orm import Session
from app.db.base import Base
from app.db.daily_products import add_daily_cleaning_products
from app.models import Product, PriceReport

MANIFEST=Path(__file__).parents[1]/'backend/app/db/daily_cleaning_catalog.json'


def test_cleaning_catalog_is_additive_idempotent_and_preserves_package_identity(tmp_path):
    engine=create_engine(f"sqlite:///{tmp_path/'cleaning.db'}")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        original=Product(name='Detergente legado 5 L',brand='Outra marca',sale_unit='unit',quantity_value=5,quantity_unit='L',is_active=True)
        db.add(original);db.commit();original_id=original.id
    add_daily_cleaning_products(engine)
    add_daily_cleaning_products(engine)
    entries=json.loads(MANIFEST.read_text())
    with Session(engine) as db:
        rows=list(db.scalars(select(Product).where(Product.is_standard.is_(True))))
        assert len(rows)==len(entries)
        assert all(p.category=='Limpeza' and p.sale_unit=='unit' and p.brand and p.image_url and p.catalog_source_url for p in rows)
        assert db.get(Product,original_id).quantity_value==5
        assert db.get(Product,original_id).brand=='Outra marca'
        assert db.scalar(select(func.count()).select_from(PriceReport))==0
        by_name={p.name:p for p in rows}
        assert by_name['Detergente Limpol neutro 500 ml'].quantity_value==500
        assert by_name['Detergente Limpol neutro 500 ml'].quantity_unit=='ml'
        bags=by_name['Saco de lixo Green Lixo preto 50 L — 30 unidades']
        assert bags.quantity_value==30 and bags.quantity_unit=='un'
        assert by_name['Sabão em pó Tixan Ypê Primavera 2,2 kg'].quantity_value==Decimal('2.2')
    engine.dispose()


def test_cleaning_products_are_found_by_name_category_and_brand_without_import(client,monkeypatch):
    from app.db.session import engine
    monkeypatch.setattr('app.api.catalog.urlopen',lambda *a,**k: (_ for _ in ()).throw(AssertionError('No external import')))
    entries=json.loads(MANIFEST.read_text())
    add_daily_cleaning_products(engine)
    try:
        params={'preferred':True,'city':'__none__'}
        rows=client.get('/api/products',params={**params,'q':'limpeza'}).json()
        assert len(rows)==len(entries)
        assert all(p['category']=='Limpeza' and p['min_price'] is None for p in rows)
        detergent=client.get('/api/products',params={**params,'q':'detergente'}).json()
        assert [p['name'] for p in detergent]==['Detergente Limpol neutro 500 ml']
        assert detergent[0]['quantity_unit']=='ml'
        soap=client.get('/api/products',params={**params,'q':'sabao em po'}).json()
        assert len(soap)==1 and soap[0]['brand']=='Tixan Ypê'
        bleach=client.get('/api/products',params={**params,'q':'agua sanitaria'}).json()
        assert len(bleach)==1 and bleach[0]['brand']=='QBoa'
    finally:
        with engine.begin() as conn:
            conn.execute(delete(Product).where(Product.catalog_source_url.in_([p['source_url'] for p in entries])))
            conn.execute(text('DELETE FROM app_data_migrations WHERE migration_key=:key'),{'key':'daily-cleaning-catalog-2026-11-06'})
