import os
import sys
from pathlib import Path
import sqlite3
from sqlalchemy import create_engine, MetaData, Table

# Ensure imports work by adding the parent dir to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from biometric_security_engine.api.config import settings
from biometric_security_engine.api.database.models import Base
from cryptography.fernet import Fernet

fernet = Fernet(settings.biometric_encryption_key.encode('utf-8'))

def encrypt_vector(embedding: list) -> str:
    emb_str = ",".join(map(str, embedding))
    encrypted_bytes = fernet.encrypt(emb_str.encode('utf-8'))
    return encrypted_bytes.decode('utf-8')
def migrate_biometrics():
    print("Starting Biometric Vectors Migration & Encryption...")
    
    # 1. Connect to old SQLite biometric DB
    old_bio_db = Path("biometric_security_engine/biometric_db.sqlite")
    if not old_bio_db.exists():
        print(f"Old DB not found at {old_bio_db}. Skipping biometric migration.")
        return

    sqlite_conn = sqlite3.connect(old_bio_db)
    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT student_id, embedding, registered_at FROM students")
    rows = cursor.fetchall()
    
    # 2. Connect to new PostgreSQL Database
    print(f"Connecting to Postgres: {settings.database_url}")
    pg_engine = create_engine(settings.database_url)
    
    # Ensure tables are created
    Base.metadata.create_all(pg_engine)
    
    with pg_engine.begin() as pg_conn:
        for row in rows:
            student_id, embedding_str, registered_at = row
            # Convert string to list of floats
            embedding_list = [float(x) for x in embedding_str.split(',')]
            
            # Encrypt the embedding!
            encrypted_embedding = encrypt_vector(embedding_list)
            
            # Insert into Postgres
            pg_conn.execute(
                Base.metadata.tables['student_biometrics'].insert(),
                [{"student_id": student_id, "encrypted_embedding": encrypted_embedding, "registered_at": registered_at}]
            )
    
    print(f"Successfully migrated and encrypted {len(rows)} biometric records.")
    sqlite_conn.close()

def migrate_rbac_tables():
    print("Starting RBAC Data Migration...")
    old_rbac_db = "sqlite:///biometric_security_engine/biometric_security.db"
    sqlite_engine = create_engine(old_rbac_db)
    pg_engine = create_engine(settings.database_url)
    
    # Using reflection to copy data table by table
    meta_sqlite = MetaData()
    meta_sqlite.reflect(bind=sqlite_engine)
    
    meta_pg = MetaData()
    meta_pg.reflect(bind=pg_engine)
    
    with sqlite_engine.connect() as sqlite_conn:
        with pg_engine.begin() as pg_conn:
            for sqlite_table in meta_sqlite.sorted_tables:
                table_name = sqlite_table.name
                if table_name == 'alembic_version' or table_name == 'student_biometrics':
                    continue
                    
                pg_table = meta_pg.tables[table_name]
                
                rows = sqlite_conn.execute(sqlite_table.select()).fetchall()
                if rows:
                    print(f"Migrating {len(rows)} rows for table '{table_name}'...")
                    # Convert row tuples back to dictionaries for bulk insert
                    data = [row._mapping for row in rows]
                    pg_conn.execute(pg_table.insert(), data)

    print("RBAC Migration Complete.")

if __name__ == "__main__":
    print("--- Secure-FEPRH Database Migration Tool ---")
    migrate_biometrics()
    migrate_rbac_tables()
    print("Migration finished successfully! You can now safely delete the local .sqlite files.")
