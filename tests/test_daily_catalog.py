import json
from pathlib import Path
from sqlalchemy import create_engine, select, func, text, delete
from sqlalchemy.orm import Session
from app.db.base import Base
from app.db.daily_products import add_daily_products, matches_daily_product, MIGRATION_KEY
from app.models import Product, PriceReport, User


def test_daily_aliases_preserve_food_variants():
    assert matches_daily_product('batatas', 'Batata inglesa')
    assert matches_daily_product('batatas', 'Batata-doce')
    assert matches_daily_product('batata inglesa', 'Batata inglesa')
    assert not matches_daily_product('batata inglesa', 'Batata-doce')
    assert not matches_daily_product('batata frita', 'Batata inglesa')
    assert matches_daily_product('feijoes', 'Feijão preto')
    assert matches_daily_product('limões', 'Limão tahiti')
    assert matches_daily_product('cafe', 'Café Cafuso tradicional')


def test_daily_catalog_is_sourced_additive_and_preserves_existing_prices(tmp_path):
    engine=create_engine(f"sqlite:///{tmp_path/'daily.db'}")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        old=Product(name='Batatas fritas Marca antiga',brand='Marca antiga',is_standard=False,is_active=True)
        db.add(old);db.commit();old_id=old.id
    add_daily_products(engine)
    with Session(engine) as db:
        rows=list(db.scalars(select(Product).where(Product.is_standard.is_(True))))
        assert len(rows)==25
        assert all(p.image_url.startswith('https://www.extrabom.com.br/') and p.catalog_source_url.startswith('https://www.extrabom.com.br/p/') for p in rows)
        potatoes=[p for p in rows if matches_daily_product('batatas',p.name)]
        assert {p.name for p in potatoes}=={'Batata inglesa','Batata-doce'}
        assert all(p.sale_unit=='kg' and p.quantity_value==1 and p.quantity_unit=='kg' and p.ean is None for p in potatoes)
        assert db.scalar(select(func.count()).select_from(PriceReport))==0
        assert db.get(Product,old_id).brand=='Marca antiga'
        potatoes[0].name='Nome alterado pela administração';db.commit()
    add_daily_products(engine)
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(Product))==26
        assert db.scalar(select(Product).where(Product.name=='Nome alterado pela administração'))
    engine.dispose()


def test_everyday_search_is_separate_from_brands_and_never_contacts_external(client,monkeypatch):
    from app.db.session import engine, SessionLocal
    def forbidden(*args,**kwargs):
        raise AssertionError('Everyday search must not query an external catalog')
    monkeypatch.setattr('app.api.catalog.urlopen',forbidden)
    add_daily_products(engine)
    with SessionLocal() as db:
        uid=db.scalar(select(User.id))
        manual=Product(name='Abóbora moranga da comunidade', category='Legumes', sale_unit='kg',quantity_value=1,quantity_unit='kg',packaging='A granel',created_by_id=uid,is_active=True)
        db.add(manual);db.commit();manual_id=manual.id
    try:
        own=client.get('/api/products',params={'q':'abóbora moranga','everyday':'true'}).json()
        assert [p['id'] for p in own]==[manual_id]
        rows=client.get('/api/products',params={'q':'batatas','everyday':'true'}).json()
        assert {p['name'] for p in rows}=={'Batata inglesa','Batata-doce'}
        assert all(p['is_standard'] and p['min_price'] is None for p in rows)
        assert client.get('/api/products',params={'q':'inexistente','everyday':'true'}).json()==[]
        assert client.get('/api/products',params={'q':'batata frita','everyday':'true'}).json()==[]
        fruit=client.get('/api/products',params={'category':'Frutas','everyday':'true'}).json()
        assert fruit and all(p['category']=='Frutas' and p['is_standard'] for p in fruit)
        normal=client.get('/api/products',params={'q':'Camil','external':'false'}).json()
        assert normal and all(not p['is_standard'] for p in normal)
    finally:
        with engine.begin() as conn:
            conn.execute(delete(Product).where(Product.is_standard.is_(True) | (Product.id==manual_id)))
            conn.execute(text('DELETE FROM app_data_migrations WHERE migration_key=:key'),{'key':MIGRATION_KEY})


def test_purple_skin_variant_is_additive_separate_and_has_no_imported_price(tmp_path):
    from app.db.daily_products import add_daily_variants
    engine=create_engine(f"sqlite:///{tmp_path/'variants.db'}")
    Base.metadata.create_all(engine)
    add_daily_products(engine)
    with Session(engine) as db:
        original=db.scalar(select(Product).where(Product.name=='Batata-doce'))
        original_id=original.id;original_photo=original.image_url
    add_daily_variants(engine);add_daily_variants(engine)
    with Session(engine) as db:
        original=db.get(Product,original_id)
        variant=db.scalar(select(Product).where(Product.name=='Batata-doce de casca roxa'))
        assert variant.id!=original_id and variant.image_url!=original_photo
        assert original.name=='Batata-doce' and original.image_url==original_photo
        assert variant.sale_unit=='kg' and variant.quantity_unit=='kg' and variant.quantity_value==1
        assert db.scalar(select(func.count()).select_from(Product))==26
        assert db.scalar(select(func.count()).select_from(PriceReport))==0
        assert matches_daily_product('batata doce roxa',variant.name)
        assert matches_daily_product('batata doce rosada',original.name,catalog_source_url=original.catalog_source_url)
        assert not matches_daily_product('batata doce rosada',original.name)
        assert not matches_daily_product('batata doce polpa roxa',variant.name)
    engine.dispose()


def test_preferred_search_falls_back_to_local_brands_without_external_import(client, monkeypatch):
    from app.db.session import engine, SessionLocal
    def forbidden(*args, **kwargs):
        raise AssertionError('Consumer search must not import external results')
    monkeypatch.setattr('app.api.catalog.urlopen', forbidden)
    add_daily_products(engine)
    try:
        potatoes = client.get('/api/products', params={'q':'batatas','preferred':True}).json()
        assert {p['name'] for p in potatoes} == {'Batata inglesa','Batata-doce'}
        assert all(p['is_standard'] for p in potatoes)
        brands = client.get('/api/products', params={'q':'Camil','preferred':True}).json()
        assert brands and all('camil' in (p['brand'] or '').lower() for p in brands)
        assert client.get('/api/products', params={'q':'produto inexiste','preferred':True}).json() == []
        assert client.get('/api/products', params={'q':'batatas','city':'Cidade sem loja','preferred':True}).json()[0]['min_price'] is None
    finally:
        with engine.begin() as conn:
            conn.execute(delete(Product).where(Product.is_standard.is_(True)))
            conn.execute(text('DELETE FROM app_data_migrations WHERE migration_key=:key'),{'key':MIGRATION_KEY})


def test_pepper_addition_is_idempotent_and_searchable_without_accents(tmp_path):
    from app.db.daily_products import add_daily_search_additions
    engine = create_engine(f"sqlite:///{tmp_path/'peppers.db'}")
    Base.metadata.create_all(engine)
    add_daily_search_additions(engine)
    add_daily_search_additions(engine)
    with Session(engine) as db:
        products = list(db.scalars(select(Product)))
        assert len(products) == 1
        assert matches_daily_product('pimentao', products[0].name)
        assert products[0].is_standard and products[0].sale_unit == 'kg'
        assert products[0].catalog_source_url.endswith('/2900/')
        assert db.scalar(select(func.count()).select_from(PriceReport)) == 0
    engine.dispose()
