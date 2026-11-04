"""Requested Cariacica units, official addresses verified on 2026-11-04.
No price, stock or unverified coordinates are inserted.
"""
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session
from app.models import Market

SOURCES = [
    'https://www.supermercadosbh.com.br/lojas/itaciba-es/',
    'https://www.extrabom.com.br/lojas/101-campo-grande/folheto/',
    'https://www.superperim.com.br/nossaslojas',
]
BRANCHES = [
    dict(name='Supermercados BH Itacibá', address='Alameda da Frincasa, 191', neighborhood='Itacibá', city='Cariacica', state='ES'),
    dict(name='Extrabom Campo Grande', address='Av. Expedito Garcia, 947', neighborhood='Campo Grande', city='Cariacica', state='ES'),
    dict(name='Perim Campo Grande', address='Av. Mário Gurgel, 5221, BR-262', neighborhood='São Francisco', city='Cariacica', state='ES'),
]


def add_cariacica_markets(engine):
    with engine.begin() as connection:
        connection.execute(text('CREATE TABLE IF NOT EXISTS app_data_migrations (migration_key VARCHAR(100) PRIMARY KEY)'))
        marker = connection.execute(text(
            "INSERT INTO app_data_migrations (migration_key) VALUES ('cariacica-markets-2026-11-04') "
            "ON CONFLICT (migration_key) DO NOTHING RETURNING migration_key"
        )).scalar()
        if marker is None:
            return
        with Session(bind=connection) as db:
            for values in BRANCHES:
                exists = db.scalar(select(Market.id).where(
                    func.lower(Market.city) == values['city'].lower(), Market.state == values['state'],
                    (func.lower(Market.name) == values['name'].lower()) |
                    (func.lower(Market.address) == values['address'].lower()),
                ))
                if exists is None:
                    db.add(Market(**values, is_active=True))
            db.flush()
