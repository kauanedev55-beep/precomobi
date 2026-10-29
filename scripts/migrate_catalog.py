"""Copy an existing SQLite app DB to an EMPTY app database, with verification.

Default is read-only planning. The source is always read-only. Does not create
Supabase Auth identities, delete data, merge conflicting records, or seed prices.
TARGET_DATABASE_URL must be provided as an environment variable (never a CLI arg).
"""
import argparse
from datetime import datetime, timezone
from pathlib import Path
import os
import re
import sqlite3
import sys
import tempfile

from sqlalchemy import MetaData, create_engine, event, func, inspect, select, text

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from app.db.base import Base
import app.models  # Register the existing domain tables, no application startup.


def snapshot(source: Path, destination: Path):
    if not source.is_file():
        raise ValueError("O arquivo do banco de origem não existe.")
    with sqlite3.connect(source.resolve().as_uri() + "?mode=ro", uri=True) as src:
        if src.execute("PRAGMA quick_check").fetchone()[0] != "ok":
            raise ValueError("A integridade do SQLite não foi aprovada.")
        destination.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(destination) as dst:
            src.backup(dst)
    os.chmod(destination, 0o600)


def copy_database(source_path: Path, target_url: str, apply=False, backup_dir: Path | None = None, schema="precomobi"):
    if not target_url:
        raise ValueError("Defina TARGET_DATABASE_URL em ambiente seguro.")
    if target_url.startswith("postgres://"):
        target_url = target_url.replace("postgres://", "postgresql+psycopg://", 1)
    elif target_url.startswith("postgresql://"):
        target_url = target_url.replace("postgresql://", "postgresql+psycopg://", 1)
    if not re.fullmatch(r"[a-z][a-z0-9_]{0,62}", schema) or schema in {"public", "auth", "storage", "information_schema"} or schema.startswith("pg_"):
        raise ValueError("Use um schema privado próprio, como precomobi.")
    target = create_engine(target_url, pool_pre_ping=True)
    if target.dialect.name == "sqlite" and target.url.database and Path(target.url.database).resolve() == source_path.resolve():
        raise ValueError("Origem e destino não podem ser o mesmo banco.")
    if target.dialect.name == "postgresql" and target.url.query.get("sslmode") not in ("require", "verify-ca", "verify-full"):
        raise ValueError("O destino PostgreSQL exige sslmode=require ou verificação TLS mais restrita.")
    if target.dialect.name == "postgresql":
        @event.listens_for(target, "connect")
        def use_schema(connection, _record):
            previous = connection.autocommit
            connection.autocommit = True
            try:
                with connection.cursor() as cursor:
                    cursor.execute(f'SET search_path TO "{schema}"')
            finally:
                connection.autocommit = previous
    try:
        with tempfile.TemporaryDirectory(prefix="precomobi-migrate-") as tmp:
            snap_path = Path(tmp) / "snapshot.db"
            snapshot(source_path, snap_path)
            src = create_engine("sqlite:///" + str(snap_path))
            try:
                metadata = MetaData()
                metadata.reflect(bind=src)
                known = {t.name for t in Base.metadata.sorted_tables}
                unknown = set(metadata.tables) - known - {"sqlite_sequence", "alembic_version"}
                if unknown:
                    raise ValueError("Há tabelas não reconhecidas; revisão necessária: " + ", ".join(sorted(unknown)))
                # The app schema is copied, without claiming to back up auth.users.
                counts = {}
                with src.connect() as source, target.connect() as destination:
                    target_tables = set(inspect(destination).get_table_names())
                    for table in Base.metadata.sorted_tables:
                        counts[table.name] = source.scalar(select(func.count()).select_from(metadata.tables[table.name])) if table.name in metadata.tables else 0
                        if table.name in target_tables and destination.scalar(select(func.count()).select_from(table)):
                            raise ValueError("Destino contém registros em " + table.name + ". Migração interrompida sem sobrescrever.")
                if not apply:
                    return {"applied": False, "counts": counts}
                backup_dir = backup_dir or source_path.parent / "backups"
                stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
                backup_path = backup_dir / ("precomobi-before-migration-" + stamp + ".db")
                snapshot(snap_path, backup_path)
                with src.connect() as source, target.begin() as destination:
                    # Transactional DDL on PostgreSQL; no DELETE/DROP/UPDATE.
                    if target.dialect.name == "postgresql":
                        destination.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema}"'))
                        destination.execute(text(f'REVOKE ALL ON SCHEMA "{schema}" FROM PUBLIC'))
                    Base.metadata.create_all(destination)
                    for table in Base.metadata.sorted_tables:
                        # Re-check after entering the write transaction. Stop the
                        # app's writes during migration to avoid concurrent inserts.
                        if destination.scalar(select(func.count()).select_from(table)):
                            raise ValueError("Destino mudou durante a preparação. Migração cancelada.")
                        if table.name not in metadata.tables:
                            continue
                        original = metadata.tables[table.name]
                        extras = set(original.columns.keys()) - set(table.columns.keys())
                        # Historical accidental auth fields on catalog tables are
                        # unused by the app; keep them in the source backup only.
                        unused = {"email_verified", "verification_token_hash", "verification_expires_at", "verification_sent_at"}
                        if extras - unused:
                            raise ValueError("Colunas não reconhecidas em " + table.name + ": " + ", ".join(sorted(extras - unused)))
                        for row in source.execute(select(original)).mappings():
                            values = {key: value for key, value in row.items() if key in table.columns}
                            # Old accounts predate the verification fields. Existing
                            # Supabase Auth remains authoritative for actual login.
                            if table.name == "users" and "email_verified" not in values:
                                values["email_verified"] = True
                            destination.execute(table.insert().values(**values))
                        if destination.scalar(select(func.count()).select_from(table)) != counts[table.name]:
                            raise ValueError("Contagem divergente em " + table.name)
                        if target.dialect.name == "postgresql" and "id" in table.columns:
                            destination.execute(text(
                                "SELECT setval(pg_get_serial_sequence(:table_name, 'id'), "
                                f"COALESCE((SELECT MAX(id) FROM {table.name}), 1), "
                                f"EXISTS(SELECT 1 FROM {table.name}))"
                            ), {"table_name": f"{schema}.{table.name}"})
                return {"applied": True, "counts": counts, "backup": str(backup_path)}
            finally:
                src.dispose()
    finally:
        target.dispose()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--schema", default="precomobi")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--backup-dir", type=Path)
    args = parser.parse_args()
    try:
        result = copy_database(args.source, os.environ.get("TARGET_DATABASE_URL", ""), args.apply, args.backup_dir, args.schema)
    except Exception as exc:
        # DB errors can contain credentials and row contents. Never print raw SQL
        # driver exceptions; deliberate validation messages are safe and useful.
        print(str(exc) if isinstance(exc, ValueError) else "Falha na migração (" + type(exc).__name__ + "). Nenhuma credencial foi exibida.", file=sys.stderr)
        return 1
    import json
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
