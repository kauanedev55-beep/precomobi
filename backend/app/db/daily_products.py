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
    aliases = {'feijoes':'feijao', 'paes':'pao', 'acucares':'acucar', 'batatinha':'batata', 'limoes':'limao', 'mamaos':'mamao', 'salsinha':'salsa', 'salsinhas':'salsa', 'tangerina':'mexerica', 'tangerinas':'mexerica', 'bergamota':'mexerica', 'bergamotas':'mexerica', 'folhagens':'folha', 'folhosas':'folha'}
    return [aliases.get(word, word[:-1] if word.endswith('s') and len(word)>3 else word)
            for word in re.findall(r'[a-z0-9]+',value)]

def matches_daily_product(query, name, category=None, brand=None, catalog_source_url=None):
    # This alias describes the reference photo, not a relabeling of legacy prices.
    photo_alias = 'casca rosada avermelhada vermelha' if catalog_source_url == 'https://www.extrabom.com.br/p/batata-doce-unidade/1475/' else None
    name_words = terms(name)
    leafy = {'alface', 'couve', 'agriao', 'rucula', 'espinafre', 'taioba', 'mostarda', 'chicoria', 'escarola', 'almeirao'}
    leaf_alias = 'folhas folhosas folhagens' if category == 'Verduras' and leafy.intersection(name_words) and 'flor' not in name_words else None
    words = terms(' '.join(filter(None, [name, category, brand, photo_alias, leaf_alias])))
    return all(any(word.startswith(token) for word in words) for token in terms(query))

def add_daily_products(engine, *, manifest='daily_catalog.json', migration_key=MIGRATION_KEY):
    entries = json.loads(Path(__file__).with_name(manifest).read_text())
    with engine.begin() as connection:
        connection.execute(text('CREATE TABLE IF NOT EXISTS app_data_migrations (migration_key VARCHAR(100) PRIMARY KEY)'))
        marker = connection.execute(text('INSERT INTO app_data_migrations (migration_key) VALUES (:key) ON CONFLICT (migration_key) DO NOTHING RETURNING migration_key'), {'key':migration_key}).scalar()
        if marker is None:
            return
        with Session(bind=connection) as db:
            for entry in entries:
                # Never relabel imported products or transfer their observations.
                # Matching source URLs allow already curated records to be reused.
                if db.scalar(select(Product.id).where(Product.is_standard.is_(True), Product.catalog_source_url==entry['source_url'])):
                    continue
                values = {k:v for k,v in entry.items() if k not in ('source_url','source_name','source_label')}
                values['quantity_value'] = Decimal(values['quantity_value'])
                db.add(Product(**values, is_standard=True, catalog_source_url=entry['source_url'],
                    description=f"Identificação e imagem de referência do {entry.get('source_label', 'catálogo Extrabom')}. Não indica estoque ou preço em uma unidade específica.",is_active=True))
            db.flush()


def add_daily_variants(engine):
    add_daily_products(engine, manifest='daily_variants.json', migration_key='daily-visual-variants-2026-11-06')


def add_daily_search_additions(engine):
    add_daily_products(engine, manifest='daily_search_additions.json', migration_key='daily-search-additions-2026-11-06')


def add_daily_produce_expansion(engine):
    add_daily_products(engine, manifest='daily_produce_expansion.json', migration_key='daily-produce-expansion-2026-11-06')


def add_daily_cleaning_products(engine):
    add_daily_products(engine, manifest='daily_cleaning_catalog.json', migration_key='daily-cleaning-catalog-2026-11-06')
