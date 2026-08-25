import os
import sqlite3
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime
from contextlib import contextmanager
try:
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
    from psycopg2.extras import RealDictCursor
    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False

DEFAULT_PG_URL = "postgresql://postgres:postgres@localhost:5432/plagiarism_engine_db"

def clean_str(val: Any) -> str:
    """Sanitizes string inputs to prevent NUL byte (0x00) PostgreSQL driver crashes."""
    if val is None:
        return ""
    s = str(val)
    return s.replace('\x00', '')

class SystemDBStore:
    """
    Production PostgreSQL Relational Storage Manager.
    Automatically creates the 'plagiarism_engine_db' database on local PostgreSQL,
    persisting projects, research papers, keywords, files, and plagiarism scan reports.
    """

    def __init__(self, pg_connection_string: Optional[str] = None, sqlite_db_path: str = "./system_db.sqlite"):
        self.pg_conn_str = pg_connection_string or os.getenv("DATABASE_URL") or DEFAULT_PG_URL
        self.sqlite_path = sqlite_db_path
        self.mode = "sqlite"

        if HAS_PSYCOPG2:
            try:
                self._ensure_pg_database_exists()
                conn = psycopg2.connect(self.pg_conn_str)
                conn.close()
                self.mode = "postgresql"
            except Exception:
                self.mode = "sqlite"

        self._init_schema()

    def _ensure_pg_database_exists(self):
        """Connect to default 'postgres' database and create 'plagiarism_engine_db' if it doesn't exist."""
        try:
            base_conn_str = "postgresql://postgres:postgres@localhost:5432/postgres"
            conn = psycopg2.connect(base_conn_str)
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            cur = conn.cursor()
            
            cur.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = 'plagiarism_engine_db';")
            exists = cur.fetchone()
            if not exists:
                cur.execute("CREATE DATABASE plagiarism_engine_db;")
            cur.close()
            conn.close()
        except Exception:
            pass

    def _get_connection(self):
        if self.mode == "postgresql":
            return psycopg2.connect(self.pg_conn_str)
        else:
            conn = sqlite3.connect(self.sqlite_path)
            conn.row_factory = sqlite3.Row
            conn.execute('PRAGMA journal_mode=WAL')
            conn.execute('PRAGMA synchronous=NORMAL')
            return conn

    def _init_schema(self):
        """Initializes relational tables for projects, research papers, files, and scan audit reports."""
        conn = self._get_connection()
        cur = conn.cursor()

        if self.mode == "postgresql":
            cur.execute("""
            CREATE TABLE IF NOT EXISTS projects (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS papers (
                id VARCHAR(255) PRIMARY KEY,
                title VARCHAR(500) NOT NULL,
                author VARCHAR(255),
                keywords TEXT,
                extracted_text TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS project_files (
                id VARCHAR(255) PRIMARY KEY,
                project_id VARCHAR(255) REFERENCES projects(id) ON DELETE CASCADE,
                relative_path TEXT NOT NULL,
                file_type VARCHAR(50),
                content TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS scan_reports (
                id VARCHAR(255) PRIMARY KEY,
                query_id VARCHAR(255) NOT NULL,
                target_id VARCHAR(255) NOT NULL,
                similarity_score FLOAT NOT NULL,
                match_type VARCHAR(50) NOT NULL,
                details TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);
            CREATE INDEX IF NOT EXISTS idx_projects_created ON projects(created_at);
            CREATE INDEX IF NOT EXISTS idx_scan_reports_query_id ON scan_reports(query_id);
            CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);
            """)
        else:
            cur.executescript("""
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS papers (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                author TEXT,
                keywords TEXT,
                extracted_text TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS project_files (
                id TEXT PRIMARY KEY,
                project_id TEXT,
                relative_path TEXT NOT NULL,
                file_type TEXT,
                content TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(id)
            );
            CREATE TABLE IF NOT EXISTS scan_reports (
                id TEXT PRIMARY KEY,
                query_id TEXT NOT NULL,
                target_id TEXT NOT NULL,
                similarity_score REAL NOT NULL,
                match_type TEXT NOT NULL,
                details TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);
            CREATE INDEX IF NOT EXISTS idx_projects_created ON projects(created_at);
            CREATE INDEX IF NOT EXISTS idx_scan_reports_query_id ON scan_reports(query_id);
            CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);
            """)

        conn.commit()
        conn.close()

    def save_paper(self, paper_id: str, title: str, author: str, keywords: str, text: str) -> None:
        """Save or update a research paper record in PostgreSQL."""
        conn = self._get_connection()
        cur = conn.cursor()
        pid, ptitle, pauthor, pkw, ptext = clean_str(paper_id), clean_str(title), clean_str(author), clean_str(keywords), clean_str(text)

        if self.mode == "postgresql":
            cur.execute("""
                INSERT INTO papers (id, title, author, keywords, extracted_text)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, keywords=EXCLUDED.keywords, extracted_text=EXCLUDED.extracted_text;
            """, (pid, ptitle, pauthor, pkw, ptext))
        else:
            cur.execute("""
                INSERT OR REPLACE INTO papers (id, title, author, keywords, extracted_text)
                VALUES (?, ?, ?, ?, ?);
            """, (pid, ptitle, pauthor, pkw, ptext))
        conn.commit()
        conn.close()

    def save_project(self, project_id: str, project_name: str, files: List[Dict[str, Any]]) -> None:
        """Save a project folder and its core files to PostgreSQL or SQLite using bulk batch inserts."""
        conn = self._get_connection()
        try:
            cur = conn.cursor()
            pid, pname = clean_str(project_id), clean_str(project_name)

            file_rows = []
            for f in files:
                rel_path = clean_str(f.get('relative_path', f.get('filename', '')))
                file_id = clean_str(f"{pid}::{rel_path}")
                f_type = clean_str(f.get('file_type', ''))
                f_content = clean_str(f.get('content', ''))
                file_rows.append((file_id, pid, rel_path, f_type, f_content))

            if self.mode == "postgresql":
                cur.execute("INSERT INTO projects (id, name) VALUES (%s, %s) ON CONFLICT (id) DO NOTHING;", (pid, pname))
                if file_rows:
                    cur.executemany("""
                        INSERT INTO project_files (id, project_id, relative_path, file_type, content)
                        VALUES (%s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content;
                    """, file_rows)
            else:
                cur.execute("INSERT OR REPLACE INTO projects (id, name) VALUES (?, ?);", (pid, pname))
                if file_rows:
                    cur.executemany("""
                        INSERT OR REPLACE INTO project_files (id, project_id, relative_path, file_type, content)
                        VALUES (?, ?, ?, ?, ?);
                    """, file_rows)
            conn.commit()
        finally:
            conn.close()

    def save_scan_report(self, report_id: str, query_id: str, target_id: str, score: float, match_type: str, details: str) -> None:
        """Save a scan audit report record."""
        conn = self._get_connection()
        cur = conn.cursor()
        rid, qid, tid, mtype, det = clean_str(report_id), clean_str(query_id), clean_str(target_id), clean_str(match_type), clean_str(details)

        if self.mode == "postgresql":
            cur.execute("""
                INSERT INTO scan_reports (id, query_id, target_id, similarity_score, match_type, details)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET similarity_score=EXCLUDED.similarity_score, details=EXCLUDED.details;
            """, (rid, qid, tid, score, mtype, det))
        else:
            cur.execute("""
                INSERT OR REPLACE INTO scan_reports (id, query_id, target_id, similarity_score, match_type, details)
                VALUES (?, ?, ?, ?, ?, ?);
            """, (rid, qid, tid, score, mtype, det))
        conn.commit()
        conn.close()

    def get_all_papers(self) -> List[Dict[str, Any]]:
        """Retrieve all stored research papers from PostgreSQL."""
        conn = self._get_connection()
        cur = conn.cursor()
        cur.execute("SELECT id, title, author, keywords, extracted_text FROM papers;")
        rows = cur.fetchall()
        conn.close()

        papers = []
        for r in rows:
            if isinstance(r, dict) or hasattr(r, 'keys'):
                papers.append(dict(r))
            else:
                papers.append({"id": r[0], "title": r[1], "author": r[2], "keywords": r[3], "content": r[4], "filename": r[1]})
        return papers

    def get_all_projects(self, page: int = 1, limit: int = 20) -> List[Dict[str, Any]]:
        """Retrieve all stored projects."""
        conn = self._get_connection()
        cur = conn.cursor()
        offset = (page - 1) * limit
        
        if self.mode == "postgresql":
            cur.execute("SELECT id, name, created_at FROM projects ORDER BY created_at DESC LIMIT %s OFFSET %s;", (limit, offset))
        else:
            cur.execute("SELECT id, name, created_at FROM projects ORDER BY created_at DESC LIMIT ? OFFSET ?;", (limit, offset))
            
        rows = cur.fetchall()
        conn.close()

        projects = []
        for r in rows:
            if isinstance(r, dict) or hasattr(r, 'keys'):
                projects.append(dict(r))
            else:
                projects.append({"id": r[0], "name": r[1], "created_at": r[2]})
        return projects

    def check_project_exists(self, project_names: list[str]) -> list[str]:
        """Check which project names already exist in the database."""
        if not project_names:
            return []
            
        conn = self._get_connection()
        cur = conn.cursor()
        
        if self.mode == "postgresql":
            placeholders = ','.join(['%s'] * len(project_names))
            cur.execute(f"SELECT name FROM projects WHERE name IN ({placeholders})", tuple(project_names))
        else:
            placeholders = ','.join(['?'] * len(project_names))
            cur.execute(f"SELECT name FROM projects WHERE name IN ({placeholders})", tuple(project_names))
            
        rows = cur.fetchall()
        conn.close()
        
        return [row[0] if not (isinstance(row, dict) or hasattr(row, 'keys')) else row['name'] for row in rows]
