import json
from decimal import Decimal
from pathlib import Path
from sqlalchemy import create_engine, select, func, delete, text
from sqlalchemy.orm import Session
from app.db.base import Base
from app.db.daily_products import add_dairy_deli_hygiene_catalog, matches_daily_product
from app.models import Product, Market, PriceReport
from app.schemas.mvp import ProductCreate

ROWS=json.loads((Path(__file__).parents[1]/'backend/app/db/daily_dairy_deli_hygiene.json').read_text())
KEY='daily-dairy-deli-hygiene-2026-11-06'


def test_migration_preserves_existing_barcode_and_observations_and_is_idempotent(tmp_path):
    engine=create_engine(f"sqlite:///{tmp_path/'dairy.db'}")
    Base.metadata.create_all(engine)
    coded=next(x for x in ROWS if x.get('ean'))
    with Session(engine) as db:
        original=Product(name='Registro anterior',ean=coded['ean'],brand='Marca anterior',is_active=True)
        market=Market(name='Loja anterior',address='Rua anterior',city='Serra',state='ES')
        db.add_all([original,market]);db.flush()
        report=PriceReport(product_id=original.id,market_id=market.id,price=Decimal('7.99'),source_type='community',is_active=True)
        db.add(report);db.commit();pid=original.id;rid=report.id
    add_dairy_deli_hygiene_catalog(engine)
    add_dairy_deli_hygiene_catalog(engine)
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(Product))==len(ROWS)
        assert db.get(Product,pid).name=='Registro anterior'
        assert db.get(Product,pid).brand=='Marca anterior'
        assert db.get(PriceReport,rid).product_id==pid
        assert db.get(PriceReport,rid).price==Decimal('7.99')
        assert db.scalar(select(func.count()).select_from(PriceReport))==1
        assert db.scalar(select(Product).where(Product.catalog_source_url==coded['source_url'])) is None
    engine.dispose()


def test_codes_and_quantities_refer_to_fixed_packages_not_weight_labels():
    codes=[x['ean'] for x in ROWS if x.get('ean')]
    assert len(codes)>100 and len(codes)==len(set(codes))
    for row in ROWS:
        if row.get('ean'):
            assert row['sale_unit']=='unit' and 'carone.com.br' in row['source_url']
            ProductCreate(name=row['name'],category=row['category'],brand=row['brand'],ean=row['ean'],sale_unit='unit',packaging='Unidade',quantity_value=row['quantity_value'],quantity_unit=row['quantity_unit'])
        if row['sale_unit']=='kg':
            assert row['quantity_value']=='1' and row['quantity_unit']=='kg' and not row.get('ean')
            assert '(por quilo)' in row['name']
    paper=next(x for x in ROWS if x['name'].startswith('Papel Higiênico Neve') and '12 rolos' in x['name'])
    assert paper['quantity_value']=='12' and paper['quantity_unit']=='un'
    diaper=next(x for x in ROWS if 'Huggies Tripla' in x['name'] and 'M 36' in x['name'])
    assert diaper['quantity_value']=='36' and diaper['quantity_unit']=='un'
    assert {'Frios','Laticínios','Higiene'}=={x['category'] for x in ROWS}
    assert any('por quilo' in x['name'] for x in ROWS if x['category']=='Frios')
    assert any(x['sale_unit']=='unit' for x in ROWS if x['category']=='Frios')


def test_familiar_consumer_names():
    for q,name,category in [('pasta de dente','Creme Dental Colgate 90g','Higiene'),('cotonete','Hastes Flexíveis Mili 75un','Higiene'),('papéis higiênicos','Papel Higiênico Neve 12 rolos','Higiene'),('xampu','Shampoo Seda 325ml','Higiene'),('muçarela','Queijo Mussarela 150g','Laticínios')]:
        assert matches_daily_product(q,name,category)
    assert not matches_daily_product('pasta de dente','Pasta de amendoim','Mercearia')
    assert not matches_daily_product('cotonete','Algodão 50g','Higiene')


def test_new_codes_are_found_locally_and_categories_remain_separate(client,monkeypatch):
    from app.db.session import engine
    monkeypatch.setattr('app.api.catalog.urlopen',lambda *a,**k: (_ for _ in ()).throw(AssertionError('Unexpected external barcode lookup')))
    add_dairy_deli_hygiene_catalog(engine)
    try:
        for category in ['Laticínios','Frios','Higiene']:
            coded=next(x for x in ROWS if x['category']==category and x.get('ean'))
            result=client.get('/api/products',params={'ean':coded['ean'],'city':'__none__'})
            assert result.status_code==200,result.text
            product=result.json()[0]
            assert product['name']==coded['name'] and product['catalog_source_url']==coded['source_url']
            assert product['min_price'] is None
            rows=client.get('/api/products',params={'preferred':True,'category':category,'city':'__none__'}).json()
            assert rows and all(x['category']==category and x['min_price'] is None for x in rows)
        for query in ['pasta de dente','cotonete','papéis higiênicos','xampu']:
            rows=client.get('/api/products',params={'preferred':True,'q':query,'city':'__none__'}).json()
            assert rows and all(x['category']=='Higiene' for x in rows)
    finally:
        with engine.begin() as conn:
            conn.execute(delete(Product).where(Product.catalog_source_url.in_([x['source_url'] for x in ROWS])))
            conn.execute(text('DELETE FROM app_data_migrations WHERE migration_key=:key'),{'key':KEY})


def test_manual_registration_accepts_deli_by_weight():
    product=ProductCreate(name='Presunto de teste',category='Frios',brand='Marca de teste',no_barcode=True,sale_unit='kg',packaging='A granel',quantity_value='1',quantity_unit='kg')
    assert product.category=='Frios'
