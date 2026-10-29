from decimal import Decimal
from datetime import datetime, timezone, timedelta
import hashlib
import importlib.util
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.models import Market, Product, PriceReport, User
from app.core.security import create_access_token, hash_password
from app.core.config import get_settings


@pytest.fixture
def isolated(client, monkeypatch):
    from main import app
    engine = create_engine('sqlite://', connect_args={'check_same_thread':False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        user = User(name='Test',email='shopping@test.local',password_hash=hash_password('password123'),email_verified=True)
        db.add(user); db.commit(); uid=user.id
    def database():
        with Session(engine) as db: yield db
    app.dependency_overrides[get_db] = database
    monkeypatch.setattr(get_settings(),'demo_mode',False)
    try:
        yield client, engine, {'Authorization':'Bearer '+create_access_token(uid)}
    finally:
        app.dependency_overrides.pop(get_db,None)
        engine.dispose()


def catalog(engine):
    with Session(engine) as db:
        p = [Product(name='P1'),Product(name='P2')]
        markets=[Market(name=f'M{i}',address=f'Rua {i}',city='Serra',state='ES') for i in range(5)]
        db.add_all(p+markets); db.commit()
        return [x.id for x in p], [x.id for x in markets]


def test_catalog_is_shared_with_all_devices_and_does_not_require_gps(isolated):
    client, engine, headers = isolated
    _, mids = catalog(engine)
    first=client.get('/api/markets',headers={'User-Agent':'Mozilla Android'})
    second=client.get('/api/markets',headers={'User-Agent':'Mozilla Windows'})
    assert first.status_code == second.status_code == 200
    assert first.json() == second.json()
    assert {m['id'] for m in first.json()} == set(mids)
    assert all(m['latitude'] is None for m in first.json())
    assert first.headers['Cache-Control'] == 'no-store'


def test_all_markets_latest_prices_partial_and_common_basket(isolated):
    client, engine, headers = isolated
    pids,mids=catalog(engine)
    old=datetime.now(timezone.utc)-timedelta(days=1)
    with Session(engine) as db:
        db.add_all([
            PriceReport(product_id=pids[0],market_id=mids[0],price=Decimal('99'),source_type='community',reported_at=old),
            PriceReport(product_id=pids[0],market_id=mids[0],price=Decimal('2.50'),source_type='community'),
            PriceReport(product_id=pids[1],market_id=mids[0],price=Decimal('5'),source_type='community'),
            PriceReport(product_id=pids[0],market_id=mids[1],price=Decimal('3'),source_type='community'),
            PriceReport(product_id=pids[0],market_id=mids[2],price=Decimal('4'),source_type='community'),
            PriceReport(product_id=pids[1],market_id=mids[1],price=Decimal('.01'),source_type='development'),
        ]); db.commit()
    shopping=client.post('/api/shopping-lists',headers=headers,json={'name':'Real basket','items':[{'product_id':pids[0],'quantity':3},{'product_id':pids[1],'quantity':2}]}).json()
    r=client.get('/api/comparisons/'+str(shopping['id']),headers=headers)
    assert r.status_code == 200,r.text
    result=r.json(); rows={x['market_id']:x for x in result['results']}
    assert len(rows)==5  # Previously silently cut to three.
    assert rows[mids[0]]['complete'] is True
    assert Decimal(rows[mids[0]]['total'])==Decimal('17.50')
    assert rows[mids[1]]['total'] is None
    assert Decimal(rows[mids[1]]['available_total'])==Decimal('9')
    assert rows[mids[1]]['found_items']==1
    assert result['common_product_ids']==[pids[0]]
    assert result['common_items_count']==1
    assert result['priced_markets_count']==3
    assert Decimal(rows[mids[0]]['comparable_total'])==Decimal('7.50')
    assert Decimal(rows[mids[1]]['comparable_total'])==Decimal('9')
    assert rows[mids[4]]['comparable_total'] is None
    assert rows[mids[0]]['address']=='Rua 0'
    assert rows[mids[0]]['latitude'] is None
    # A price change in one client is seen immediately in another read.
    update=client.post('/api/price-reports',headers=headers,json={'product_id':pids[0],'market_id':mids[1],'price':'1.50'})
    assert update.status_code==201,update.text
    again=client.get('/api/comparisons/'+str(shopping['id']),headers=headers).json()
    row=next(m for m in again['results'] if m['market_id']==mids[1])
    assert Decimal(row['available_total'])==Decimal('4.50')
    assert len(client.get('/api/price-reports',params={'product_id':pids[0],'market_id':mids[1]}).json())==2


def test_disjoint_partial_prices_never_create_comparable_saving(isolated):
    client,engine,headers=isolated
    pids,mids=catalog(engine)
    with Session(engine) as db:
        for pid,mid in zip(pids,mids): db.add(PriceReport(product_id=pid,market_id=mid,price=Decimal('5'),source_type='community'))
        db.commit()
    shopping=client.post('/api/shopping-lists',headers=headers,json={'name':'Disjoint','items':[{'product_id':pid,'quantity':1} for pid in pids]}).json()
    result=client.get('/api/comparisons/'+str(shopping['id']),headers=headers).json()
    assert result['common_items_count']==0
    assert all(r['comparable_total'] is None and r['total'] is None for r in result['results'])


def migration_module():
    path=Path(__file__).resolve().parents[1]/'scripts'/'migrate_catalog.py'
    spec=importlib.util.spec_from_file_location('migration',path)
    module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


def test_migration_preserves_source_ids_relationships_prices_and_refuses_overwrite(tmp_path):
    m=migration_module()
    source=tmp_path/'source.db'; target=tmp_path/'target.db'
    engine=create_engine('sqlite:///'+str(source)); Base.metadata.create_all(engine)
    with Session(engine) as db:
        user=User(id=42,name='Existing user',email='old@test.local',password_hash='existing-hash',email_verified=True)
        product=Product(id=73,name='Existing product',ean='3017620422003')
        market=Market(id=81,name='Existing shop',address='Preserved address',city='Serra',state='ES')
        db.add_all([user,product,market]); db.flush()
        db.add(PriceReport(id=96,product_id=73,market_id=81,user_id=42,price=Decimal('8.39'),source_type='community'))
        db.commit()
    engine.dispose()
    before=hashlib.sha256(source.read_bytes()).hexdigest()
    url='sqlite:///'+str(target)
    assert m.copy_database(source,url)['applied'] is False
    assert m.copy_database(source,url,True,tmp_path/'backups')['counts']['markets']==1
    assert hashlib.sha256(source.read_bytes()).hexdigest()==before
    dest=create_engine(url)
    with Session(dest) as db:
        assert db.get(Market,81).address=='Preserved address'
        report=db.get(PriceReport,96)
        assert (report.product_id,report.market_id,report.user_id,report.price)==(73,81,42,Decimal('8.39'))
        assert db.get(User,42).password_hash=='existing-hash'
    with pytest.raises(ValueError,match='contém registros'):
        m.copy_database(source,url,True,tmp_path/'backups')
    with Session(dest) as db: assert len(list(db.scalars(select(PriceReport))))==1
    dest.dispose()


def test_older_catalog_schema_does_not_require_unrelated_auth_columns(tmp_path):
    engine=create_engine('sqlite:///'+str(tmp_path/'legacy.db'))
    with engine.begin() as conn:
        conn.execute(text('CREATE TABLE markets (id INTEGER PRIMARY KEY, name VARCHAR, address VARCHAR, neighborhood VARCHAR, city VARCHAR, state VARCHAR, latitude NUMERIC, longitude NUMERIC, is_active BOOLEAN, created_at TIMESTAMP)'))
        conn.execute(text("INSERT INTO markets VALUES (7, 'Existing shop', 'Real address', NULL, 'Serra', 'ES', NULL, NULL, 1, CURRENT_TIMESTAMP)"))
    with Session(engine) as db: assert db.get(Market,7).name=='Existing shop'
    engine.dispose()
