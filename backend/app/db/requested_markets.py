"""Add only the three real stores explicitly requested on 2026-10-30.

Addresses verified against superatacadosempretem.com.br and
assai.com.br/loja/assai-serra and /loja/assai-vitoria-aeroporto.
No geocoding or prices are inferred. The transactional marker prevents repeat
imports, including after an administrator later changes a record.
"""
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.models import Market

REQUESTED = [
    dict(name="Sempretem Jacaraípe", address="Rua Rômulo Castelo, 754", neighborhood="Irema", city="Serra", state="ES"),
    dict(name="Assaí Serra", address="Avenida Iriri, 120", neighborhood="Planalto de Carapina", city="Serra", state="ES"),
    dict(name="Assaí Vitória Aeroporto", address="Av. Fernando Ferrari, 3740", neighborhood="Aeroporto", city="Vitória", state="ES"),
]


def add_requested_markets(engine):
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE IF NOT EXISTS app_data_migrations (migration_key VARCHAR(100) PRIMARY KEY)"))
        marker = connection.execute(text(
            "INSERT INTO app_data_migrations (migration_key) VALUES ('requested-markets-2026-10-30') "
            "ON CONFLICT (migration_key) DO NOTHING RETURNING migration_key"
        )).scalar()
        if marker is None:
            return
        with Session(bind=connection) as db:
            for values in REQUESTED:
                # Existing names are kept untouched, including inactive records.
                exists = db.scalar(select(Market.id).where(
                    func.lower(Market.name) == values["name"].lower(),
                    func.lower(Market.city) == values["city"].lower(), Market.state == values["state"],
                ))
                if exists is None:
                    db.add(Market(**values, is_active=True))
            db.flush()
