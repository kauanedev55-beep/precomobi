import json
from decimal import Decimal
from pathlib import Path
from sqlalchemy import create_engine,select,func,delete,text
from sqlalchemy.orm import Session
from app.db.base import Base
from app.db.daily_products import add_general_retail_catalog,matches_daily_product
from app.models import Product,PriceReport,Market
from app.schemas.mvp import ProductCreate

MANIFEST=Path(__file__).parents[1]/'backend/app/db/daily_retail_catalog.json'


def test_retail_migration_preserves_existing_prices_and_never_merges_brands(tmp_path):
    entries=json.loads(MANIFEST.read_text())
    engine=create_engine(f"sqlite:///{tmp_path/'general.db'}")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        original=Product(name=entries[0]['name'],brand='Marca anterior',sale_unit='unit',is_active=True)
        market=Market(name='Mercado anterior',address='Rua anterior',city='Serra',state='ES')
        db.add_all([original,market]);db.flush()
        report=PriceReport(product_id=original.id,market_id=market.id,price=Decimal('8.99'),source_type='community',is_active=True)
        db.add(report);db.commit();original_id=original.id;report_id=report.id
    add_general_retail_catalog(engine)
    add_general_retail_catalog(engine)
    with Session(engine) as db:
        rows=list(db.scalars(select(Product).where(Product.is_standard.is_(True))))
        assert len(rows)==len(entries)
        assert len({p.catalog_source_url for p in rows})==len(rows)
        assert db.get(Product,original_id).brand=='Marca anterior'
        assert db.get(PriceReport,report_id).price==Decimal('8.99')
        assert db.get(PriceReport,report_id).product_id==original_id
        assert db.scalar(select(func.count()).select_from(PriceReport))==1
        assert all(p.ean is None and p.image_url and p.id!=original_id for p in rows)
    engine.dispose()


def test_pack_sizes_and_food_types_are_not_inferred_from_marketing_numbers():
    rows=json.loads(MANIFEST.read_text())
    assert {'Laticínios','Bebidas','Doces','Mercearia','Grãos','Massas','Padaria','Limpeza','Frutas','Verduras','Legumes'}<={p['category'] for p in rows}
    assert any('carone.com.br' in p['source_url'] for p in rows)
    assert any('extrabom.com.br' in p['source_url'] for p in rows)
    assert all(p['category']!='Grãos' for p in rows if p['name'].lower().startswith('açúcar'))
    multipack=next(p for p in rows if '6X350' in p['name'])
    assert Decimal(multipack['quantity_value'])==2100 and multipack['quantity_unit']=='ml'
    protein=next(p for p in rows if 'Proteica 15g' in p['name'])
    assert Decimal(protein['quantity_value'])==250 and protein['quantity_unit']=='ml'
    milk=next(p for p in rows if 'Chamyto' in p['name'])
    assert Decimal(milk['quantity_value'])==450 and milk['quantity_unit']=='g'
    assert all(p['sale_unit']=='unit' for p in rows if p['category']=='Limpeza')


def test_consumer_terms_find_floor_cleaner_and_powder_without_matching_everything():
    assert matches_daily_product('limpador de chão','Limpador Perfumado Coala Lima-Limão 120ml','Limpeza')
    assert matches_daily_product('sabão em pó','Lava Roupas em Pó Tixan Ypê Primavera 1,6 kg','Limpeza')
    assert not matches_daily_product('limpador de chão','Sabão em Pó Omo 800g','Limpeza')
    assert not matches_daily_product('de','Qualquer produto','Mercearia')
    assert matches_daily_product('','Qualquer produto','Mercearia')


def test_general_catalog_is_searchable_with_local_region_prices_only(client,monkeypatch):
    from app.db.session import engine
    entries=json.loads(MANIFEST.read_text())
    monkeypatch.setattr('app.api.catalog.urlopen',lambda *a,**k: (_ for _ in ()).throw(AssertionError('No external import')))
    add_general_retail_catalog(engine)
    try:
        params={'preferred':True,'city':'__none__','external':False}
        floor=client.get('/api/products',params={**params,'q':'limpador de chao'}).json()
        assert len({p['brand'] for p in floor})>=4
        assert all(p['category']=='Limpeza' and p['min_price'] is None for p in floor)
        powders=client.get('/api/products',params={**params,'q':'sabao em po'}).json()
        assert len({p['brand'] for p in powders})>=5
        assert all(p['sale_unit']=='unit' and p['min_price'] is None for p in powders)
        for category in ['Doces','Laticínios','Bebidas']:
            rows=client.get('/api/products',params={**params,'category':category}).json()
            assert rows and all(p['category']==category and p['min_price'] is None for p in rows)
    finally:
        with engine.begin() as conn:
            conn.execute(delete(Product).where(Product.catalog_source_url.in_([p['source_url'] for p in entries])))
            conn.execute(text('DELETE FROM app_data_migrations WHERE migration_key=:key'),{'key':'daily-retail-catalog-2026-11-06'})


def test_manual_registration_accepts_the_same_sweets_category():
    product=ProductCreate(name='Chocolate de teste',category='Doces',brand='Marca de teste',no_brand=False,no_barcode=True,sale_unit='unit',packaging='Pacote',quantity_value='100',quantity_unit='g')
    assert product.category=='Doces'
