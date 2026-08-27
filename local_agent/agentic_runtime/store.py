from __future__ import annotations

import json
import sqlite3
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional


class EventStore:
    def __init__(self, state_dir: str) -> None:
        self.state_dir = Path(state_dir).expanduser().resolve()
        self.state_dir.mkdir(parents=True, exist_ok=True)
        self.db_path = self.state_dir / "agent.db"
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS runs (
                    run_id TEXT PRIMARY KEY,
                    task TEXT NOT NULL,
                    model TEXT NOT NULL,
                    status TEXT NOT NULL,
                    plan_json TEXT NOT NULL DEFAULT '{}',
                    final_answer TEXT NOT NULL DEFAULT '',
                    iterations INTEGER NOT NULL DEFAULT 0,
                    created_at REAL NOT NULL,
                    updated_at REAL NOT NULL
                );
                CREATE TABLE IF NOT EXISTS events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    run_id TEXT NOT NULL,
                    kind TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    created_at REAL NOT NULL,
                    FOREIGN KEY(run_id) REFERENCES runs(run_id)
                );
                CREATE INDEX IF NOT EXISTS idx_events_run_id ON events(run_id);
                """
            )

    def start_run(self, task: str, model: str) -> str:
        run_id = uuid.uuid4().hex[:12]
        now = time.time()
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO runs(run_id, task, model, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                (run_id, task, model, "running", now, now),
            )
        return run_id

    def update_run(self, run_id: str, **values: Any) -> None:
        allowed = {"status", "plan_json", "final_answer", "iterations"}
        values = {key: value for key, value in values.items() if key in allowed}
        if not values:
            return
        values["updated_at"] = time.time()
        assignments = ", ".join(f"{key} = ?" for key in values)
        with self._connect() as conn:
            conn.execute(
                f"UPDATE runs SET {assignments} WHERE run_id = ?",
                tuple(values.values()) + (run_id,),
            )

    def add_event(self, run_id: str, kind: str, payload: Any) -> None:
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO events(run_id, kind, payload_json, created_at) VALUES (?, ?, ?, ?)",
                (run_id, kind, json.dumps(payload, ensure_ascii=False, default=str), time.time()),
            )

    def get_run(self, run_id: str) -> Optional[Dict[str, Any]]:
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM runs WHERE run_id = ?", (run_id,)).fetchone()
        if row is None:
            return None
        item = dict(row)
        item["plan"] = json.loads(item.pop("plan_json") or "{}")
        return item

    def list_events(self, run_id: str) -> List[Dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT kind, payload_json, created_at FROM events WHERE run_id = ? ORDER BY id",
                (run_id,),
            ).fetchall()
        return [
            {"kind": row["kind"], "payload": json.loads(row["payload_json"]), "created_at": row["created_at"]}
            for row in rows
        ]
