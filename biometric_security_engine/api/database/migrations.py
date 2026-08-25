import sqlite3
from pathlib import Path
import sys

# Ensure AI engine root is on sys.path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DB_PATH = BASE_DIR / "biometric_security.db"

def run_migrations():
    print(f"Running migrations on {DB_PATH}")
    if not DB_PATH.exists():
        print("Database not found. Initializing via SQLAlchemy first...")
        return
        
    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()
    
    # 1. Create system_settings table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS system_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT UNIQUE NOT NULL,
            value TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 2. Add missing indexes for performance
    cur.execute("CREATE INDEX IF NOT EXISTS idx_session_attendance_session_id ON session_attendance_records(session_id);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_session_attendance_student_id ON session_attendance_records(student_id);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_academic_sessions_status ON academic_sessions(status);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);")
    
    conn.commit()
    conn.close()
    print("Migrations applied successfully.")

if __name__ == "__main__":
    run_migrations()
