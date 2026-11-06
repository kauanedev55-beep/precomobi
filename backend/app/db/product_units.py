"""Add catalog metadata without rewriting legacy weights, prices or list quantities."""
from sqlalchemy import inspect, text


def add_product_units(engine):
    columns = {c["name"] for c in inspect(engine).get_columns("products")}
    definitions = {
        "sale_unit": "VARCHAR(10) NOT NULL DEFAULT 'unit'",
        "packaging": "VARCHAR(60)",
        "description": "VARCHAR(500)",
        "created_by_id": "INTEGER REFERENCES users(id)",
        "is_standard": "BOOLEAN NOT NULL DEFAULT FALSE",
        "catalog_source_url": "VARCHAR(500)",
    }
    with engine.begin() as conn:
        for name, definition in definitions.items():
            if name not in columns:
                conn.execute(text(f"ALTER TABLE products ADD COLUMN {name} {definition}"))
