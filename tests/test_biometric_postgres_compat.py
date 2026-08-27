from __future__ import annotations

import os
import sys

import pytest
from pathlib import Path

import numpy as np
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

ROOT = Path(__file__).resolve().parents[1]
BIO_ROOT = ROOT / "biometric_security_engine"
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(BIO_ROOT))


def test_database_url_normalization():
    from biometric_security_engine.api.database.connection import _normalise_database_url

    assert _normalise_database_url("postgres://u:p@localhost/db").startswith("postgresql+psycopg2://")
    assert _normalise_database_url("postgresql://u:p@localhost/db").startswith("postgresql+psycopg2://")
    assert _normalise_database_url("postgresql+psycopg2://u:p@localhost/db").startswith("postgresql+psycopg2://")


def test_sqlite_engine_and_models_are_usable():
    from biometric_security_engine.api.database.models import Base, StudentBiometric

    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, expire_on_commit=False)
    db = Session()
    db.add(StudentBiometric(student_id="student@example.com", encrypted_embedding="x"))
    db.commit()
    assert db.query(StudentBiometric).filter(StudentBiometric.student_id == "student@example.com").one().student_id == "student@example.com"
    db.close()


def test_postgres_safe_student_id_lookup():
    from biometric_security_engine.api.database.models import Base, User
    from biometric_security_engine.api.routers.biometric import _find_user_for_student_id

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, expire_on_commit=False)
    db = Session()
    db.add_all(
        [
            User(id=7, full_name="Email Student", email="student@example.com", hashed_password="x"),
            User(id=8, full_name="Numeric Student", email="numeric@example.com", hashed_password="x"),
        ]
    )
    db.commit()
    assert _find_user_for_student_id(db, "student@example.com").id == 7
    assert _find_user_for_student_id(db, "8").id == 8
    assert _find_user_for_student_id(db, "2024-CS-001") is None
    db.close()


def test_embedding_validation_and_corrupt_row_skip():
    from biometric_security_engine.core.face_engine import BiometricFaceEngine

    engine = BiometricFaceEngine()
    valid = np.ones(128, dtype=float).tolist()
    assert engine.verify_identity(valid, valid) == (True, 0.0)
    result = engine.search_1_to_n(valid, {"bad": [0.0], "good": valid})
    assert result["authenticated"] is True
    assert result["student_id"] == "good"


def test_aes256_embedding_round_trip_and_legacy_read():
    from biometric_security_engine.api.services import biometric_service

    vector = np.linspace(0.01, 1.28, 128, dtype=float).tolist()
    encrypted = biometric_service.encrypt_vector(vector)
    assert encrypted.startswith("v2.")
    assert np.allclose(biometric_service.decrypt_vector(encrypted), vector, atol=1e-6)

    legacy = biometric_service._LEGACY_FERNET.encrypt(
        ",".join(map(str, vector)).encode("utf-8")
    )
    assert np.allclose(
        biometric_service.decrypt_vector(legacy.decode("utf-8")),
        vector,
        atol=1e-6,
    )


def test_portable_migration_runner_sqlite(tmp_path):
    from biometric_security_engine.api.database.migrations import run_migrations

    result = run_migrations(f"sqlite:///{tmp_path / 'migration.db'}")
    assert result["dialect"] == "sqlite"
    assert result["system_settings"] is True
    assert "idx_users_email" in result["indexes"]


def test_postgresql_url_engine_options():
    from biometric_security_engine.api.database.connection import _create_engine

    neon = _create_engine("postgresql://u:p@ep-test.eu-central-1.aws.neon.tech/db")
    local = _create_engine("postgresql://u:p@localhost/db")
    try:
        assert neon.url.drivername == "postgresql+psycopg2"
        assert neon.url.query.get("sslmode") == "require"
        assert local.url.drivername == "postgresql+psycopg2"
        assert local.url.query.get("sslmode") is None
    finally:
        neon.dispose()
        local.dispose()


def test_optional_postgresql_migration_runner():
    database_url = os.getenv("TEST_POSTGRES_URL")
    if not database_url:
        pytest.skip("Set TEST_POSTGRES_URL to run a live PostgreSQL migration test")
    from biometric_security_engine.api.database.migrations import run_migrations

    result = run_migrations(database_url)
    assert result["dialect"] == "postgresql"
    assert result["system_settings"] is True


def test_live_api_import():
    from biometric_security_engine.api.main import app

    assert app.title.startswith("Secure-FEPRH")
    assert "/api/biometrics/identify" in app.openapi()["paths"]
