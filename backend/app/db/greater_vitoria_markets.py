"""Six requested branches. Official source URLs are kept alongside the import.
Verified 2026-11-02; addresses only, no invented prices or coordinates.
"""
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session
from app.models import Market

SOURCES = [
    'https://www.superperim.com.br/nossaslojas',
    'https://www.extrabom.com.br/lojas/38-itapoa/',
    'https://www.extrabom.com.br/lojas/64-jardim-camburi/',
    'https://www.carone.com.br/checkout',
]
BRANCHES = [
    dict(name='Perim Itapoã', address='Rua Deolindo Perim, 350', neighborhood='Itapoã', city='Vila Velha', state='ES'),
    dict(name='Extrabom Itapoã', address='Av. Fortaleza, 476', neighborhood='Itapoã', city='Vila Velha', state='ES'),
    dict(name='Carone Itaparica', address='Av. Santa Leopoldina, 2700', neighborhood='Praia de Itaparica', city='Vila Velha', state='ES'),
    dict(name='Perim Mata da Praia', address='Av. Desembargador Dermeval Lyrio, 100', neighborhood='Mata da Praia', city='Vitória', state='ES'),
    dict(name='Extrabom Jardim Camburi', address='Av. José Maria Vivacqua Santos, 520', neighborhood='Jardim Camburi', city='Vitória', state='ES'),
    dict(name='Carone Jardim da Penha', address='Av. Hugo Viola, 615', neighborhood='Jardim da Penha', city='Vitória', state='ES'),
]


def add_greater_vitoria_markets(engine):
    with engine.begin() as connection:
        connection.execute(text('CREATE TABLE IF NOT EXISTS app_data_migrations (migration_key VARCHAR(100) PRIMARY KEY)'))
        marker = connection.execute(text(
            "INSERT INTO app_data_migrations (migration_key) VALUES ('greater-vitoria-markets-2026-11-02') "
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
