from __future__ import annotations

import os
import sys
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
    valid = np.zeros(128, dtype=float).tolist()
    assert engine.verify_identity(valid, valid) == (True, 0.0)
    result = engine.search_1_to_n(valid, {"bad": [0.0], "good": valid})
    assert result["authenticated"] is True
    assert result["student_id"] == "good"


def test_live_api_import():
    from biometric_security_engine.api.main import app

    assert app.title.startswith("Secure-FEPRH")
    assert "/api/biometrics/identify" in app.openapi()["paths"]
