from __future__ import annotations

from contextlib import contextmanager
from typing import Generator
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from ..config import settings


def _normalise_database_url(database_url: str) -> str:
    """Normalize common Neon/local PostgreSQL URL variants for SQLAlchemy.

    Neon commonly supplies ``postgresql://`` or ``postgres://`` URLs and may
    include ``sslmode=require``. Local PostgreSQL usually has no SSL query
    parameter. SQLAlchemy's psycopg2 dialect is explicit here so both forms
    use the dependency declared by this project.
    """

    value = database_url.strip()
    if not value:
        raise ValueError("DATABASE_URL cannot be empty")

    if value.startswith("postgres://"):
        value = "postgresql+psycopg2://" + value[len("postgres://") :]
    elif value.startswith("postgresql://"):
        value = "postgresql+psycopg2://" + value[len("postgresql://") :]

    return value


def _create_engine(database_url: str) -> Engine:
    url = _normalise_database_url(database_url)
    parsed = urlsplit(url)
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    is_sqlite = parsed.scheme.startswith("sqlite")

    # Preserve explicit SSL settings from Neon. Do not add SSL to local
    # PostgreSQL automatically because a default local server often has no TLS.
    if parsed.hostname and "neon.tech" in parsed.hostname and "sslmode" not in query:
        query["sslmode"] = "require"
        url = urlunsplit((parsed.scheme, parsed.netloc, parsed.path, urlencode(query), parsed.fragment))

    kwargs: dict = {"pool_pre_ping": True}
    if is_sqlite:
        kwargs["connect_args"] = {"check_same_thread": False}
    else:
        kwargs.update(
            pool_size=max(1, settings.db_pool_size),
            max_overflow=max(0, settings.db_max_overflow),
            pool_recycle=max(60, settings.db_pool_recycle),
        )

    return create_engine(url, **kwargs)


engine = _create_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, expire_on_commit=False)


def get_rbac_db() -> Generator[Session, None, None]:
    """Yield one SQLAlchemy session per request and always close it."""

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_connection() -> Generator[Session, None, None]:
    """Context-manager form for scripts and non-FastAPI callers."""

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
