from functools import lru_cache
import re

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "PrecoMobi API"
    app_env: str = "development"
    demo_mode: bool = False
    api_prefix: str = "/api"
    app_db_schema: str = ""
    database_url: str = "sqlite:///../data/precomobi.db"
    cors_origins: str = "http://localhost:5173"
    secret_key: str = "precomobi-dev-secret-troque-em-producao"

    frontend_url: str = "http://localhost:5173"
    brevo_api_key: str = ""
    supabase_url: str = ""
    supabase_anon_key: str = ""

    # E-mail de boas-vindas (opcional). Enquanto smtp_host estiver vazio, o envio
    # é simplesmente pulado — cadastro continua funcionando normalmente sem e-mail.
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    email_from: str = "PreçoMobi <no-reply@precomobi.local>"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @model_validator(mode="after")
    def production_settings(self):
        if self.app_db_schema and (not re.fullmatch(r"[a-z][a-z0-9_]{0,62}", self.app_db_schema) or self.app_db_schema in {"public", "auth", "storage", "information_schema"} or self.app_db_schema.startswith("pg_")):
            raise ValueError("APP_DB_SCHEMA deve ser um schema privado próprio, como precomobi")
        if self.database_url.startswith("postgres://"):
            self.database_url = self.database_url.replace("postgres://", "postgresql+psycopg://", 1)
        elif self.database_url.startswith("postgresql://"):
            self.database_url = self.database_url.replace("postgresql://", "postgresql+psycopg://", 1)
        if self.app_env.lower() == "production":
            if len(self.secret_key) < 32 or self.secret_key.startswith("precomobi-dev-"):
                raise ValueError("Produção exige SECRET_KEY própria com pelo menos 32 caracteres")
            if self.database_url.startswith("sqlite"):
                raise ValueError("Produção exige PostgreSQL persistente; faça backup antes de migrar")
            if not self.frontend_url.startswith("https://"):
                raise ValueError("Produção exige FRONTEND_URL HTTPS")
        return self

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
