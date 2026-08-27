from __future__ import annotations

import os
import sys
import time
from pathlib import Path

import requests
from sqlalchemy import delete

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from biometric_security_engine.api.database.connection import _create_engine
from biometric_security_engine.api.database.models import User

BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000")
PASSWORD = "RBAC-smoke-pass-123"
RUN_ID = str(int(time.time()))
USERS = {
    "admin": {"email": f"rbac-admin-{RUN_ID}@example.test", "role": "University Admin"},
    "instructor": {"email": f"rbac-instructor-{RUN_ID}@example.test", "role": "Faculty Member"},
    "student": {"email": f"rbac-student-{RUN_ID}@example.test", "role": "Student"},
    "staff": {"email": f"rbac-staff-{RUN_ID}@example.test", "role": "Staff"},
}


def register_and_login(session: requests.Session, profile: dict[str, str]) -> str:
    register = session.post(
        f"{BASE_URL}/api/auth/register",
        json={
            "full_name": f"RBAC {profile['role']}",
            "email": profile["email"],
            "password": PASSWORD,
            "role": profile["role"],
            "university": "Smoke Test University",
            "department": "Testing",
        },
        timeout=30,
    )
    register.raise_for_status()
    login = session.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": profile["email"], "password": PASSWORD},
        timeout=30,
    )
    login.raise_for_status()
    return login.json()["access_token"]


def call(session: requests.Session, role: str | None, method: str, path: str, expected: int, **kwargs) -> None:
    headers = {}
    if role:
        headers["Authorization"] = f"Bearer {TOKENS[role]}"
    response = session.request(method, f"{BASE_URL}{path}", headers=headers, timeout=30, **kwargs)
    actual = response.status_code
    print(f"{role or 'anonymous':12} {method:5} {path:40} -> {actual}")
    assert actual == expected, f"{method} {path}: expected {expected}, got {actual}: {response.text[:300]}"


def cleanup() -> None:
    url = os.getenv("TEST_POSTGRES_URL")
    if not url:
        return
    engine = _create_engine(url)
    try:
        with engine.begin() as connection:
            connection.execute(delete(User).where(User.email.in_([p["email"] for p in USERS.values()])))
    finally:
        engine.dispose()


TOKENS: dict[str, str] = {}


def main() -> None:
    session = requests.Session()
    try:
        for role, profile in USERS.items():
            TOKENS[role] = register_and_login(session, profile)

        # Public/read paths across all nine business routers.
        call(session, None, "GET", "/api/system/health", 200)
        call(session, "student", "GET", "/api/projects/", 200)
        call(session, "student", "GET", "/api/teams/", 200)
        call(session, "student", "GET", "/api/meetings/", 200)
        call(session, "student", "GET", "/api/sessions/", 200)
        call(session, "student", "GET", "/api/settings/me", 200)
        call(session, "student", "GET", "/api/notifications/", 200)

        # Protected routes must reject missing credentials before handlers.
        call(session, None, "GET", "/api/users/", 401)
        call(session, None, "GET", "/api/reports/analytics", 401)
        call(session, None, "GET", "/api/settings/logs", 401)
        call(session, None, "GET", "/api/sessions/stats", 401)
        call(session, None, "POST", "/api/system/cache/clear", 401)

        # Protected allow/deny pairs. A missing resource is expected after the
        # role dependency succeeds; students must be rejected before handlers.
        call(session, "admin", "GET", "/api/users/", 200)
        call(session, "student", "GET", "/api/users/", 403)
        call(session, "admin", "GET", "/api/reports/analytics", 200)
        call(session, "student", "GET", "/api/reports/analytics", 403)
        call(session, "admin", "GET", "/api/settings/logs", 200)
        call(session, "student", "GET", "/api/settings/logs", 403)
        call(session, "admin", "GET", "/api/sessions/stats", 200)
        call(session, "student", "GET", "/api/sessions/stats", 403)
        call(session, "admin", "POST", "/api/system/cache/clear", 200)
        call(session, "student", "POST", "/api/system/cache/clear", 403)

        # Verify Instructor/Faculty Member and Staff aliases are accepted.
        call(session, "instructor", "GET", "/api/users/", 200)
        call(session, "staff", "GET", "/api/notifications/", 200)
        call(session, "instructor", "GET", "/api/reports/team-activity", 200)

        # Confirm the remaining mutation guards without creating persistent data.
        call(session, "instructor", "DELETE", "/api/teams/999999", 404)
        call(session, "student", "DELETE", "/api/teams/999999", 403)
        call(session, "instructor", "DELETE", "/api/meetings/999999", 404)
        call(session, "student", "DELETE", "/api/meetings/999999", 403)
        call(session, "instructor", "DELETE", "/api/sessions/does-not-exist", 404)
        call(session, "student", "DELETE", "/api/sessions/does-not-exist", 403)
        call(session, "admin", "DELETE", "/api/projects/does-not-exist", 404)
        call(session, "student", "DELETE", "/api/projects/does-not-exist", 403)

        print("RBAC_POSTGRES_SMOKE_PASS")
    finally:
        cleanup()


if __name__ == "__main__":
    main()
