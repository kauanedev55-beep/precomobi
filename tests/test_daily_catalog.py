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


def test_produce_expansion_keeps_identities_units_and_existing_records(tmp_path):
    from app.db.daily_products import add_daily_variants, add_daily_search_additions, add_daily_produce_expansion
    engine = create_engine(f"sqlite:///{tmp_path/'expanded.db'}")
    Base.metadata.create_all(engine)
    add_daily_products(engine)
    add_daily_variants(engine)
    add_daily_search_additions(engine)
    with Session(engine) as db:
        before = {p.id:(p.name,p.image_url,p.sale_unit) for p in db.scalars(select(Product))}
    add_daily_produce_expansion(engine)
    add_daily_produce_expansion(engine)
    manifest = json.loads((Path(__file__).parents[1]/'backend/app/db/daily_produce_expansion.json').read_text())
    with Session(engine) as db:
        rows = list(db.scalars(select(Product)))
        assert len(rows) == len(before)+len(manifest)
        assert all((db.get(Product,i).name,db.get(Product,i).image_url,db.get(Product,i).sale_unit)==values for i,values in before.items())
        assert len({p.catalog_source_url for p in rows}) == len(rows)
        assert all(p.is_standard and p.ean is None and p.image_url for p in rows)
        assert db.scalar(select(func.count()).select_from(PriceReport)) == 0
        by_name={p.name:p for p in rows}
        assert by_name['Couve'].sale_unit == 'unit'
        assert by_name['Rabanete'].sale_unit == 'unit'
        assert by_name['Repolho roxo'].sale_unit == 'kg'
        assert by_name['Morango 250 g'].quantity_value == 250
        assert by_name['Morango 250 g'].quantity_unit == 'g'
        assert by_name['Abacaxi'].sale_unit == 'unit'
    engine.dispose()


def test_expanded_produce_search_recognizes_common_names_without_mixing_types():
    assert matches_daily_product('salsinha','Salsa','Verduras')
    assert matches_daily_product('tangerina','Mexerica ponkan','Frutas')
    assert matches_daily_product('folhas','Rúcula','Verduras')
    assert matches_daily_product('folhagens','Alface roxa','Verduras')
    assert matches_daily_product('folhosas','Couve','Verduras')
    assert not matches_daily_product('folhas','Couve-flor 300 g','Verduras')
    assert not matches_daily_product('folhas','Maçã gala','Frutas')
    assert not matches_daily_product('alface roxa','Alface americana','Verduras')
    assert matches_daily_product('macas','Maçã fuji','Frutas')


def test_expanded_catalog_is_visible_in_consumer_search_and_respects_region(client, monkeypatch):
    from app.db.daily_products import add_daily_produce_expansion
    from app.db.session import engine
    monkeypatch.setattr('app.api.catalog.urlopen', lambda *a,**k: (_ for _ in ()).throw(AssertionError('No external import')))
    add_daily_produce_expansion(engine)
    manifest=json.loads((Path(__file__).parents[1]/'backend/app/db/daily_produce_expansion.json').read_text())
    try:
        leaves=client.get('/api/products',params={'q':'folhas','preferred':True,'city':'__none__'})
        assert leaves.status_code == 200
        rows=leaves.json()
        assert {'Rúcula','Couve','Espinafre','Agrião','Alface roxa'} <= {p['name'] for p in rows}
        assert all(p['category']=='Verduras' and p['is_standard'] and p['min_price'] is None for p in rows)
        assert 'Couve-flor 300 g' not in {p['name'] for p in rows}
        fruit=client.get('/api/products',params={'q':'frutas','preferred':True,'city':'__none__'}).json()
        assert len(fruit)==sum(p['category']=='Frutas' for p in manifest)
        assert all(p['category']=='Frutas' and p['min_price'] is None for p in fruit)
        lettuce=client.get('/api/products',params={'q':'alface roxa','preferred':True}).json()
        assert [p['name'] for p in lettuce]==['Alface roxa']
    finally:
        with engine.begin() as conn:
            conn.execute(delete(Product).where(Product.catalog_source_url.in_([p['source_url'] for p in manifest])))
            conn.execute(text('DELETE FROM app_data_migrations WHERE migration_key=:key'),{'key':'daily-produce-expansion-2026-11-06'})
