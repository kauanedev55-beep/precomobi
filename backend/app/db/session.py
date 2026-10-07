from collections.abc import Generator
from pathlib import Path
from urllib.parse import urlsplit

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings


settings = get_settings()
is_sqlite = settings.database_url.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}

if is_sqlite:
    # Evita "unable to open database file": o SQLite não cria a pasta sozinho,
    # só o arquivo. Isso vale tanto rodando local quanto numa hospedagem.
    # urlsplit sempre inclui 1 barra "extra" no path (parte da sintaxe sqlite://);
    # removemos só essa, para não confundir caminho relativo com absoluto (Linux).
    db_path = urlsplit(settings.database_url).path[1:]
    if db_path and db_path != ":memory:":
        Path(db_path).resolve().parent.mkdir(parents=True, exist_ok=True)

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
