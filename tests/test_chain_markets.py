from decimal import Decimal
from sqlalchemy import create_engine,select,func
from sqlalchemy.orm import Session
from app.db.base import Base
from app.db.chain_markets import BRANCHES,add_chain_markets
from app.models import Market,PriceReport,Product,ShoppingList


def test_verified_chains_are_additive_idempotent_and_preserve_edited_inactive_units(tmp_path):
    engine=create_engine(f"sqlite:///{tmp_path/'chains.db'}")
    Base.metadata.create_all(engine)
    first={k:v for k,v in BRANCHES[0].items() if k!='source'}
    with Session(engine) as db:
        existing=Market(**{**first,'address':'Endereço corrigido pela usuária'},is_active=False,latitude=Decimal('-20.1234567'),longitude=Decimal('-40.1234567'))
        db.add(existing);db.commit();oid=existing.id
    add_chain_markets(engine)
    with Session(engine) as db:
        markets=list(db.scalars(select(Market)))
        assert len(markets)==len(BRANCHES)
        old=db.get(Market,oid)
        assert not old.is_active and old.address=='Endereço corrigido pela usuária'
        assert old.latitude==Decimal('-20.1234567')
        assert all(m.latitude is None and m.longitude is None for m in markets if m.id!=oid)
        assert db.scalar(select(func.count()).select_from(PriceReport))==0
        assert db.scalar(select(func.count()).select_from(Product))==0
        old.name='Nome editado depois';db.commit()
    add_chain_markets(engine)
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(Market))==len(BRANCHES)
        assert db.get(Market,oid).name=='Nome editado depois'
    engine.dispose()


def test_manifest_has_only_verified_branches_in_requested_cities_and_no_pricing():
    assert len(BRANCHES)==49
    assert {r['city'] for r in BRANCHES}=={'Serra','Vitória','Vila Velha','Cariacica'}
    assert all(r['source'].startswith('https://') and r['address'] and 'price' not in r and 'latitude' not in r for r in BRANCHES)
    assert len({(r['name'],r['city']) for r in BRANCHES})==len(BRANCHES)
    assert not any(r['city']=='Cariacica' and r['name'].startswith(('Assaí','Atacadão')) for r in BRANCHES)
