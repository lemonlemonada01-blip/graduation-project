from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from biometric_security_engine.api.database.migrations import run_migrations
from biometric_security_engine.api.database.connection import _normalise_database_url


def verify(name: str, url: str) -> None:
    print(f"[{name}] {url.split('@')[-1]}")
    result = run_migrations(url)
    assert result["dialect"] == "postgresql"
    assert result["system_settings"] is True
    expected_indexes = {
        "idx_session_attendance_session_id",
        "idx_session_attendance_student_id",
        "idx_users_email",
        "idx_users_role",
        "idx_academic_sessions_status",
        "idx_projects_status",
    }
    assert expected_indexes.issubset(set(result["indexes"]))
    print(f"  database={result['database']}")
    print(f"  indexes={len(result['indexes'])}")


def main() -> None:
    local_url = os.getenv(
        "LOCAL_DATABASE_URL",
        "postgresql+psycopg2://postgres:postgres@127.0.0.1:5432/secure_feprh_db",
    )
    verify("local PostgreSQL", local_url)

    neon_url = os.getenv("NEON_DATABASE_URL")
    if neon_url:
        verify("Neon PostgreSQL", neon_url)
    else:
        # Neon URL normalization is still tested without requiring a cloud
        # credential in CI or a developer workstation.
        normalized = _normalise_database_url(
            "postgres://user:password@ep-example.eu-central-1.aws.neon.tech/db?sslmode=require"
        )
        assert normalized.startswith("postgresql+psycopg2://")
        assert "sslmode=require" in normalized
        print("[Neon PostgreSQL] skipped live connection (set NEON_DATABASE_URL to enable)")

    print("MIGRATION_VERIFICATION_PASS")


if __name__ == "__main__":
    main()
