from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "PrecoMobi API"
    app_env: str = "development"
    api_prefix: str = "/api"
    database_url: str = "sqlite:///../data/precomobi.db"
    cors_origins: str = "http://localhost:5173"
    secret_key: str = "precomobi-dev-secret-troque-em-producao"

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

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
