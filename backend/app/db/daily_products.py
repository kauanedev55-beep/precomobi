"""Curated retail catalog: product identity and sourced images, never retail prices."""
import json
import re
import unicodedata
from decimal import Decimal
from pathlib import Path
from sqlalchemy import select, text
from sqlalchemy.orm import Session
from app.models import Product

MIGRATION_KEY = 'daily-catalog-retail-2026-11-06'

def terms(value):
    value = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode().lower()
    aliases = {'feijoes':'feijao', 'paes':'pao', 'acucares':'acucar', 'batatinha':'batata', 'limoes':'limao', 'mamaos':'mamao'}
    return [aliases.get(word, word[:-1] if word.endswith('s') and len(word)>3 else word)
            for word in re.findall(r'[a-z0-9]+',value)]

def matches_daily_product(query, name, category=None, brand=None):
    words = terms(' '.join(filter(None, [name, category, brand])))
    return all(any(word.startswith(token) for word in words) for token in terms(query))

def add_daily_products(engine):
    entries = json.loads(Path(__file__).with_name('daily_catalog.json').read_text())
    with engine.begin() as connection:
        connection.execute(text('CREATE TABLE IF NOT EXISTS app_data_migrations (migration_key VARCHAR(100) PRIMARY KEY)'))
        marker = connection.execute(text('INSERT INTO app_data_migrations (migration_key) VALUES (:key) ON CONFLICT (migration_key) DO NOTHING RETURNING migration_key'), {'key':MIGRATION_KEY}).scalar()
        if marker is None:
            return
        with Session(bind=connection) as db:
            for entry in entries:
                # Never relabel imported products or transfer their observations.
                # Matching source URLs allow already curated records to be reused.
                if db.scalar(select(Product.id).where(Product.is_standard.is_(True), Product.catalog_source_url==entry['source_url'])):
                    continue
                values = {k:v for k,v in entry.items() if k not in ('source_url','source_name')}
                values['quantity_value'] = Decimal(values['quantity_value'])
                db.add(Product(**values, is_standard=True, catalog_source_url=entry['source_url'],
                    description='Identificação e imagem de referência do catálogo Extrabom. Não indica estoque ou preço em uma unidade específica.',is_active=True))
            db.flush()
