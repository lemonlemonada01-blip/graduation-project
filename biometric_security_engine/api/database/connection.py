import sqlite3
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from contextlib import contextmanager
from ..config import settings
from .models import Base

# --- Unified Database Connection (PostgreSQL) ---
engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_rbac_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Alias for backwards compatibility if needed
def get_db_connection():
    return get_rbac_db()
