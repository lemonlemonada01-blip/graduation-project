from pathlib import Path
from typing import List

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Application settings loaded from environment variables or ``.env``.

    ``DATABASE_URL`` is intentionally the canonical environment variable so the
    same application configuration works with Neon and local PostgreSQL.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "Secure-FEPRH Unified AI & Security Engine"
    app_version: str = "2.5.0"

    cors_origins: List[str] = ["*"]

    jwt_secret: str = "super-secret-biometric-key-123"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # Accept both DATABASE_URL (recommended) and the Python field name when
    # running locally. The default targets a local PostgreSQL database.
    database_url: str = Field(
        default="postgresql+psycopg2://postgres:postgres@localhost:5432/secure_feprh_db",
        validation_alias=AliasChoices("DATABASE_URL", "database_url"),
    )
    db_pool_size: int = 5
    db_max_overflow: int = 5
    db_pool_recycle: int = 1800

    biometric_encryption_key: str = "Kz1c3u7F_Jv4Qk3-0d9oFqYc1N_P9Q2gW_y0D8C8uG8="
    authentication_tolerance: float = 0.45
    minifasnet_model_path: str = "models/minifasnet.onnx"
    max_b64_size_bytes: int = 15 * 1024 * 1024


settings = Settings()
