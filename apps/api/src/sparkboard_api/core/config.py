"""Typed application settings, read once from the environment."""

from __future__ import annotations

from functools import lru_cache
from typing import Literal
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from pydantic import Field, SecretStr, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Query parameters that libpq understands but asyncpg rejects.
_LIBPQ_ONLY_PARAMS = frozenset({"sslmode", "channel_binding", "target_session_attrs"})


def normalize_database_url(raw: str) -> tuple[str, bool]:
    """Return an asyncpg SQLAlchemy URL and whether TLS is required.

    Managed Postgres providers (Neon, RDS, Cloud SQL, Azure) hand out libpq
    style URLs. asyncpg needs the ``postgresql+asyncpg`` scheme and refuses
    libpq-only parameters such as ``sslmode``, so they are translated here.
    """
    parts = urlsplit(raw)
    scheme = "postgresql+asyncpg"
    query = dict(parse_qsl(parts.query))
    ssl_required = query.get("sslmode", "disable") in {"require", "verify-ca", "verify-full"}
    kept = {k: v for k, v in query.items() if k not in _LIBPQ_ONLY_PARAMS}
    return urlunsplit((scheme, parts.netloc, parts.path, urlencode(kept), "")), ssl_required


class Settings(BaseSettings):
    """All runtime configuration. Every field maps to an upper-case env var."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: Literal["local", "test", "preview", "staging", "production"] = "local"
    database_url: str = "postgresql://sparkboard:sparkboard@localhost:5432/sparkboard"
    # Serverless platforms (Vercel, Cloud Run) must not keep pooled connections
    # between invocations; a transaction pooler such as PgBouncer/Neon does it.
    db_serverless: bool = False
    db_pool_size: int = Field(default=5, ge=1, le=50)

    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:8080"]
    admin_token: SecretStr | None = None
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    log_json: bool = True

    # Rate limits, expressed as requests per window per client.
    rate_limit_writes: int = 30
    rate_limit_ai: int = 10
    rate_limit_window_seconds: int = 60

    # AI provider: "none" disables every AI feature cleanly.
    ai_provider: Literal["none", "anthropic", "openai"] = "none"
    ai_model: str = "claude-opus-5-5"
    ai_effort: Literal["low", "medium", "high"] = "low"
    ai_api_key: SecretStr | None = None
    ai_base_url: str | None = None
    ai_timeout_seconds: float = 20.0

    release: str = "dev"

    # Google sign-in (Google Identity Services ID tokens). Only the public client
    # ID is needed: tokens are verified against Google's published keys.
    google_client_id: str | None = None
    # When true, posting, voting and commenting require a signed-in Google account.
    auth_required: bool = False

    @computed_field  # type: ignore[prop-decorator]
    @property
    def async_database_url(self) -> str:
        return normalize_database_url(self.database_url)[0]

    @computed_field  # type: ignore[prop-decorator]
    @property
    def database_ssl(self) -> bool:
        return normalize_database_url(self.database_url)[1]

    @property
    def ai_enabled(self) -> bool:
        return self.ai_provider != "none" and self.ai_api_key is not None


@lru_cache
def get_settings() -> Settings:
    return Settings()
