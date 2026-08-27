from __future__ import annotations

import argparse
from typing import Any

from sqlalchemy import Column, DateTime, Integer, MetaData, String, Table, Text, inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.schema import Index

try:
    from .connection import _create_engine
    from .models import Base
    from ..config import settings
except ImportError:  # Supports ``python api/database/migrations.py``.
    from api.database.connection import _create_engine
    from api.database.models import Base
    from api.config import settings


MIGRATION_METADATA = MetaData()
SYSTEM_SETTINGS = Table(
    "system_settings",
    MIGRATION_METADATA,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("key", String(255), unique=True, nullable=False),
    Column("value", Text, nullable=False),
    Column("updated_at", DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False),
)

INDEX_DEFINITIONS = (
    ("session_attendance_records", "idx_session_attendance_session_id", ("session_id",)),
    ("session_attendance_records", "idx_session_attendance_student_id", ("student_id",)),
    ("users", "idx_users_email", ("email",)),
    ("users", "idx_users_role", ("role",)),
    ("academic_sessions", "idx_academic_sessions_status", ("status",)),
    ("projects", "idx_projects_status", ("status",)),
)


def _create_indexes(connection: Any) -> list[str]:
    inspector = inspect(connection)
    created: list[str] = []
    for table_name, index_name, columns in INDEX_DEFINITIONS:
        if not inspector.has_table(table_name):
            continue
        available_columns = {column["name"] for column in inspector.get_columns(table_name)}
        if not set(columns).issubset(available_columns):
            continue
        Index(index_name, *[Base.metadata.tables[table_name].c[column] for column in columns]).create(
            bind=connection,
            checkfirst=True,
        )
        created.append(index_name)
    return created


def run_migrations(database_url: str | None = None) -> dict[str, Any]:
    """Create/update application tables and indexes for any supported SQLAlchemy URL."""
    selected_url = database_url or settings.database_url
    migration_engine: Engine = _create_engine(selected_url)

    try:
        Base.metadata.create_all(bind=migration_engine)
        MIGRATION_METADATA.create_all(bind=migration_engine, checkfirst=True)
        with migration_engine.begin() as connection:
            indexes = _create_indexes(connection)
            if migration_engine.dialect.name == "postgresql":
                database = connection.execute(text("SELECT current_database()")).scalar_one_or_none()
            else:
                database = migration_engine.url.database
    finally:
        migration_engine.dispose()

    return {
        "database": database,
        "dialect": migration_engine.dialect.name,
        "system_settings": True,
        "indexes": indexes,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Run portable Secure-FEPRH database migrations.")
    parser.add_argument(
        "--database-url",
        default=None,
        help="SQLAlchemy database URL. Defaults to DATABASE_URL/settings.database_url.",
    )
    args = parser.parse_args()
    result = run_migrations(args.database_url)
    print("Migrations applied successfully:")
    for key, value in result.items():
        print(f"  {key}: {value}")


if __name__ == "__main__":
    main()
