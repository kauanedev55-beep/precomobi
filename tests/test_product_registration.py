from decimal import Decimal
from datetime import datetime, timedelta, timezone
import uuid
import pytest
from sqlalchemy import create_engine, text, select, func
from app.db.session import SessionLocal
from app.db.product_units import add_product_units
from app.models import Product, PriceReport, ShoppingList
from conftest import register_user


def payload(**updates):
    return dict(name='Banana prata '+uuid.uuid4().hex[:6],category='Frutas',brand=None,no_brand=True,
        ean=None,no_barcode=True,sale_unit='kg',packaging='A granel',quantity_value='1',quantity_unit='kg',**updates)


def test_customer_registers_without_external_api_and_other_device_can_find(client,demo_headers,monkeypatch):
    monkeypatch.setattr('app.api.catalog.urlopen',lambda *a,**k:pytest.fail('Manual registration must not use external API'))
    data=payload()
    created=client.post('/api/products',headers=demo_headers,json=data)
    assert created.status_code==201,created.text
    product=created.json()
    assert product['sale_unit']=='kg' and product['packaging']=='A granel'
    assert product['min_price'] is None and product['ean'] is None
    with SessionLocal() as db:
        assert db.get(Product,product['id']).created_by_id is not None
        assert db.scalar(select(func.count()).select_from(PriceReport).where(PriceReport.product_id==product['id']))==0
    other,_=register_user(client)
    assert client.get(f"/api/products/{product['id']}",headers=other).json()['name']==data['name']
    assert any(p['id']==product['id'] for p in client.get('/api/products',params={'q':data['name']}).json())
    assert any(p['id']==product['id'] for p in client.get('/api/products?category=Frutas').json())
    assert client.post('/api/products',json=data).status_code==401


@pytest.mark.parametrize('change',[
    {'name':' '},{'category':'Categoria inválida'},{'brand':None,'no_brand':False},
    {'brand':'Marca','no_brand':True},{'ean':None,'no_barcode':False},
    {'ean':'1234567890123','no_barcode':False}, {'quantity_value':'0'},
    {'quantity_value':'0.750'},{'quantity_unit':'g'},{'sale_unit':'litro'},
    {'packaging':'Outro','description':None},{'quantity_value':'0.0001'},
])
def test_rejects_incomplete_or_inconsistent_registration(client,demo_headers,change):
    data=payload();data.update(change)
    assert client.post('/api/products',headers=demo_headers,json=data).status_code==422


def test_packaged_products_preserve_exact_package_and_barcode_uniqueness(client,demo_headers):
    data=payload();data.update(name='Arroz embalagem '+uuid.uuid4().hex[:6],brand='Marca teste',no_brand=False,
        category='Grãos',sale_unit='unit',packaging='Saco',quantity_value='5',quantity_unit='kg',ean='7891000315507',no_barcode=False)
    # Use a valid EAN check digit, independently generated for a test-only product.
    prefix='29'+str(uuid.uuid4().int)[:10]
    total=sum(int(n)*(3 if i%2==0 else 1) for i,n in enumerate(reversed(prefix)))
    data['ean']=prefix+str((-total)%10)
    r=client.post('/api/products',headers=demo_headers,json=data);assert r.status_code==201,r.text
    assert Decimal(r.json()['quantity_value'])==5 and r.json()['sale_unit']=='unit'
    assert client.post('/api/products',headers=demo_headers,json=data).status_code==409
    assert client.get('/api/products',params={'ean':data['ean']}).json()[0]['id']==r.json()['id']
    data.update(ean=None,no_barcode=True)
    assert client.post('/api/products',headers=demo_headers,json=data).status_code==409
    data.update(quantity_value='1')
    assert client.post('/api/products',headers=demo_headers,json=data).status_code==201


def test_kilo_weight_rounding_prices_and_saved_preview_consistency(client,demo_headers):
    p=client.post('/api/products',headers=demo_headers,json=payload()).json()
    markets=client.get('/api/markets?city=Serra').json()[:2]
    for market,price in zip(markets,['8.00','9.99']):
        r=client.post('/api/price-reports',headers=demo_headers,json={'product_id':p['id'],'market_id':market['id'],'price':price,'sale_unit':'kg'})
        assert r.status_code==201 and r.json()['sale_unit']=='kg'
    data={'name':'Fruta para casa','items':[{'product_id':p['id'],'quantity':'0.750'}]}
    preview=client.post('/api/comparisons/preview?city=Serra',headers=demo_headers,json=data)
    assert preview.status_code==200,preview.text
    priced=[m for m in preview.json()['results'] if m['complete']]
    assert [Decimal(m['total']) for m in priced]==[Decimal('6.00'),Decimal('7.49')]
    assert all(m['items'][0]['sale_unit']=='kg' for m in priced)
    saved=client.post('/api/shopping-lists',headers=demo_headers,json=data)
    assert saved.status_code==201,saved.text
    result=client.get(f"/api/comparisons/{saved.json()['id']}?city=Serra",headers=demo_headers).json()
    assert result['results']==preview.json()['results']
    mismatch=client.post('/api/price-reports',headers=demo_headers,json={'product_id':p['id'],'market_id':markets[0]['id'],'price':'6.00','sale_unit':'unit'})
    assert mismatch.status_code==422
    # Half-cent must be rounded up, not bankers' rounding.
    half={'name':'Peso mínimo','items':[{'product_id':p['id'],'quantity':'0.005'}]}
    half_result=client.post('/api/comparisons/preview?city=Serra',headers=demo_headers,json=half).json()
    assert next(m for m in half_result['results'] if m['market_id']==markets[1]['id'])['items'][0]['subtotal']=='0.05'


def test_same_product_not_overwritten_and_unit_prices_are_per_package(client,demo_headers):
    data=payload();data.update(name='Couve maço '+uuid.uuid4().hex[:6],category='Verduras',sale_unit='unit',packaging='Maço',quantity_value='1',quantity_unit='un')
    p=client.post('/api/products',headers=demo_headers,json=data).json()
    market=client.get('/api/markets?city=Serra').json()[0]
    client.post('/api/price-reports',headers=demo_headers,json={'product_id':p['id'],'market_id':market['id'],'price':'3.50','sale_unit':'unit'})
    preview=client.post('/api/comparisons/preview?city=Serra',headers=demo_headers,json={'name':'Verduras','items':[{'product_id':p['id'],'quantity':2}]}).json()
    assert next(m for m in preview['results'] if m['complete'])['total']=='7.00'
    assert client.post('/api/products',headers=demo_headers,json=data).status_code==409
    assert client.get(f"/api/products/{p['id']}").json()['packaging']=='Maço'


def test_product_migration_is_additive_and_idempotent(tmp_path):
    engine=create_engine(f"sqlite:///{tmp_path/'legacy.db'}")
    with engine.begin() as c:
        c.execute(text('CREATE TABLE users (id INTEGER PRIMARY KEY)'))
        c.execute(text('CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, quantity_value NUMERIC, quantity_unit TEXT)'))
        c.execute(text("INSERT INTO products VALUES (7,'Arroz antigo',5,'kg')"))
    add_product_units(engine);add_product_units(engine)
    with engine.connect() as c:
        row=c.execute(text('SELECT * FROM products')).mappings().one()
        assert row['name']=='Arroz antigo' and row['quantity_value']==5 and row['quantity_unit']=='kg'
        assert row['sale_unit']=='unit' and row['packaging'] is None and row['created_by_id'] is None
    engine.dispose()
