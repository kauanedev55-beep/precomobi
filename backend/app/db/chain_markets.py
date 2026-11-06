"""Verified stores only. Sources accompany each row; no prices or coordinates are seeded."""
import json
from pathlib import Path
import re
import unicodedata
from sqlalchemy import select, text
from sqlalchemy.orm import Session
from app.models import Market

BRANCHES=json.loads(Path(__file__).with_name("chain_branches_20261105.json").read_text())

def normalized(value):
    return re.sub(r"[^a-z0-9]", "", unicodedata.normalize("NFKD",value).encode("ascii","ignore").decode().lower())

def add_chain_markets(engine):
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE IF NOT EXISTS app_data_migrations (migration_key VARCHAR(100) PRIMARY KEY)"))
        marker=connection.execute(text("INSERT INTO app_data_migrations (migration_key) VALUES ('verified-chain-markets-2026-11-05') ON CONFLICT (migration_key) DO NOTHING RETURNING migration_key")).scalar()
        if marker is None:
            return
        with Session(bind=connection) as db:
            existing=list(db.scalars(select(Market)))
            for entry in BRANCHES:
                values={k:v for k,v in entry.items() if k!='source'}
                if any(normalized(m.city)==normalized(values['city']) and m.state==values['state'] and
                    (normalized(m.name)==normalized(values['name']) or normalized(m.address)==normalized(values['address'])) for m in existing):
                    continue
                market=Market(**values,is_active=True)
                db.add(market);existing.append(market)
            db.flush()
