from __future__ import annotations

import os
import sys
import time
from pathlib import Path
from typing import Any

import requests
from sqlalchemy import delete

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from biometric_security_engine.api.database.connection import _create_engine
from biometric_security_engine.api.database.models import (
    AcademicSession,
    AuditLog,
    Meeting,
    MeetingAttendee,
    Notification,
    PlagiarismScanReport,
    Project,
    ProjectComment,
    ProjectDeliverable,
    ProjectTask,
    SessionAttendanceRecord,
    StudentBiometric,
    SystemSetting,
    Team,
    TeamMember,
    User,
    UserPreference,
)

BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
POSTGRES_URL = os.getenv(
    "TEST_POSTGRES_URL",
    "postgresql+psycopg2://postgres:postgres@127.0.0.1:5432/secure_feprh_db",
)
PASSWORD = "CRUD-smoke-pass-123"
RUN_ID = str(int(time.time()))

PROFILES = {
    "admin": {"email": f"crud-admin-{RUN_ID}@example.test", "role": "University Admin"},
    "instructor": {"email": f"crud-instructor-{RUN_ID}@example.test", "role": "Faculty Member"},
    "student": {"email": f"crud-student-{RUN_ID}@example.test", "role": "Student"},
    "staff": {"email": f"crud-staff-{RUN_ID}@example.test", "role": "Staff"},
    "deletee": {"email": f"crud-deletee-{RUN_ID}@example.test", "role": "Student"},
}
TOKENS: dict[str, str] = {}
USER_IDS: dict[str, int] = {}
CREATED: dict[str, list[Any]] = {
    "projects": [],
    "teams": [],
    "meetings": [],
    "sessions": [],
    "notifications": [],
    "tasks": [],
    "members": [],
}


def request(
    session: requests.Session,
    role: str | None,
    method: str,
    path: str,
    expected: int,
    *,
    json: Any | None = None,
    params: dict[str, Any] | None = None,
    contains: str | None = None,
) -> requests.Response:
    headers = {"Authorization": f"Bearer {TOKENS[role]}"} if role else {}
    response = session.request(
        method,
        f"{BASE_URL}{path}",
        headers=headers,
        json=json,
        params=params,
        timeout=45,
    )
    print(f"{role or 'anonymous':12} {method:6} {path:44} -> {response.status_code}")
    if response.status_code != expected:
        raise AssertionError(
            f"{method} {path}: expected {expected}, got {response.status_code}: {response.text[:600]}"
        )
    if contains is not None and contains not in response.text:
        raise AssertionError(f"{method} {path}: response did not contain {contains!r}: {response.text[:600]}")
    return response


def register_and_login(session: requests.Session, key: str) -> None:
    profile = PROFILES[key]
    request(
        session,
        None,
        "POST",
        "/api/auth/register",
        200,
        json={
            "full_name": f"CRUD {profile['role']} {RUN_ID}",
            "email": profile["email"],
            "password": PASSWORD,
            "role": profile["role"],
            "university": "CRUD Test University",
            "department": "Integration Testing",
        },
    )
    login = request(
        session,
        None,
        "POST",
        "/api/auth/login",
        200,
        json={"email": profile["email"], "password": PASSWORD},
    ).json()
    TOKENS[key] = login["access_token"]
    USER_IDS[key] = int(login["user"]["id"])


def cleanup() -> None:
    engine = _create_engine(POSTGRES_URL)
    emails = [profile["email"] for profile in PROFILES.values()]
    try:
        with engine.begin() as connection:
            if CREATED["notifications"]:
                connection.execute(delete(Notification).where(Notification.id.in_(CREATED["notifications"])))
            if CREATED["meetings"]:
                connection.execute(delete(MeetingAttendee).where(MeetingAttendee.meeting_id.in_(CREATED["meetings"])))
                connection.execute(delete(Meeting).where(Meeting.id.in_(CREATED["meetings"])))
            if CREATED["sessions"]:
                connection.execute(delete(SessionAttendanceRecord).where(SessionAttendanceRecord.session_id.in_(CREATED["sessions"])))
                connection.execute(delete(AcademicSession).where(AcademicSession.id.in_(CREATED["sessions"])))
            if CREATED["tasks"]:
                connection.execute(delete(ProjectTask).where(ProjectTask.id.in_(CREATED["tasks"])))
            if CREATED["projects"]:
                connection.execute(delete(ProjectComment).where(ProjectComment.project_id.in_(CREATED["projects"])))
                connection.execute(delete(ProjectDeliverable).where(ProjectDeliverable.project_id.in_(CREATED["projects"])))
                connection.execute(delete(Project).where(Project.id.in_(CREATED["projects"])))
            if CREATED["members"]:
                connection.execute(delete(TeamMember).where(TeamMember.id.in_(CREATED["members"])))
            if CREATED["teams"]:
                connection.execute(delete(Team).where(Team.id.in_(CREATED["teams"])))
            if USER_IDS:
                connection.execute(delete(StudentBiometric).where(StudentBiometric.student_id.in_(emails)))
                connection.execute(delete(UserPreference).where(UserPreference.user_id.in_(USER_IDS.values())))
                connection.execute(delete(ProjectComment).where(ProjectComment.user_id.in_(USER_IDS.values())))
                connection.execute(delete(MeetingAttendee).where(MeetingAttendee.user_id.in_(USER_IDS.values())))
                connection.execute(delete(AuditLog).where(AuditLog.user_id.in_(USER_IDS.values())))
                connection.execute(delete(User).where(User.id.in_(USER_IDS.values())))
            connection.execute(delete(User).where(User.email.in_(emails)))
    finally:
        engine.dispose()


def main() -> None:
    session = requests.Session()
    try:
        for key in PROFILES:
            register_and_login(session, key)

        # System router: database health/readiness and admin-only cache operation.
        health = request(session, None, "GET", "/api/system/health", 200).json()
        assert health.get("database") in {"connected", "ok"}, health
        request(session, None, "GET", "/api/system/ready", 200)
        request(session, "admin", "POST", "/api/system/cache/clear", 200)
        request(session, "student", "POST", "/api/system/cache/clear", 403)

        # Users router: list, update, status patch, password reset, delete.
        request(session, "admin", "GET", "/api/users/", 200)
        request(session, "instructor", "GET", "/api/users/", 200)
        request(session, "student", "GET", "/api/users/", 403)
        target_id = USER_IDS["student"]
        request(
            session,
            "admin",
            "PUT",
            f"/api/users/{target_id}",
            200,
            json={"full_name": f"CRUD Student Updated {RUN_ID}", "department": "Updated Testing"},
        )
        request(session, "admin", "PATCH", f"/api/users/{target_id}/status", 200, json={"status": "Inactive"})
        reset_password = request(session, "admin", "POST", f"/api/users/{target_id}/reset-password", 200).json()["temp_password"]
        request(session, "student", "PUT", f"/api/users/{target_id}", 403, json={"full_name": "forbidden"})
        request(session, "admin", "DELETE", f"/api/users/{USER_IDS['deletee']}", 200)
        USER_IDS.pop("deletee")

        # Sessions router: create, list, roster, clock-in, stats, update, delete.
        session_id = f"CRUD-S-{RUN_ID}"
        CREATED["sessions"].append(session_id)
        session_payload = {
            "id": session_id,
            "course_code": "CRUD-101",
            "course_name": "CRUD Integration Testing",
            "session_type": "Lab",
            "room": "Test Lab 1",
            "date": "2026-08-27",
            "time_range": "09:00 AM - 10:00 AM",
            "grace_period": 10,
            "enrolled": 4,
            "status": "Upcoming",
        }
        request(session, "instructor", "POST", "/api/sessions/", 200, json=session_payload)
        request(session, "student", "GET", "/api/sessions/", 200, contains=session_id)
        request(session, "student", "GET", f"/api/sessions/{session_id}/roster", 200)
        clock = request(
            session,
            "student",
            "POST",
            f"/api/sessions/{session_id}/clockin",
            200,
            json={
                "student_id": PROFILES["student"]["email"],
                "student_name": f"CRUD Student {RUN_ID}",
                "verification_method": "Integration Test",
                "confidence": "100%",
            },
        ).json()
        assert clock["record"]["status"] == "Present", clock
        request(session, "admin", "GET", "/api/sessions/stats", 200)
        request(session, "student", "GET", "/api/sessions/stats", 403)
        request(session, "instructor", "PUT", f"/api/sessions/{session_id}", 200, json={"room": "Test Lab 2", "status": "Live Now"})
        request(session, "instructor", "DELETE", f"/api/sessions/{session_id}", 200)
        CREATED["sessions"].remove(session_id)

        # Projects router: project, detail, tasks, comments, update/status, delete.
        project_payload = {
            "title": f"CRUD Project {RUN_ID}",
            "abstract": "Full PostgreSQL CRUD integration fixture",
            "domain": "Testing",
            "status": "Proposed",
            "supervisor_name": f"CRUD Instructor {RUN_ID}",
            "department": "Integration Testing",
            "university": "CRUD Test University",
            "academic_year": "2026/2027",
        }
        project_id = request(session, "student", "POST", "/api/projects/", 200, json=project_payload).json()["project_id"]
        CREATED["projects"].append(project_id)
        request(session, None, "GET", "/api/projects/", 200, contains=project_id)
        request(session, None, "GET", f"/api/projects/{project_id}", 200, contains=project_id)
        request(session, None, "GET", f"/api/projects/{project_id}/tasks", 200)
        task_payload = {"title": f"CRUD Task {RUN_ID}", "description": "Task payload", "status": "To Do", "priority": "High", "category": "QA", "assignee_name": "CRUD Student"}
        task_id = request(session, "instructor", "POST", f"/api/projects/{project_id}/tasks", 200, json=task_payload).json()["task_id"]
        CREATED["tasks"].append(task_id)
        request(session, "instructor", "PUT", f"/api/projects/{project_id}/tasks/{task_id}", 200, json={**task_payload, "status": "Done"})
        request(session, None, "GET", f"/api/projects/{project_id}/comments", 200)
        comment = request(session, "student", "POST", f"/api/projects/{project_id}/comments", 200, json={"content": f"CRUD comment {RUN_ID}"}).json()
        request(session, "instructor", "DELETE", f"/api/projects/{project_id}/tasks/{task_id}", 200)
        CREATED["tasks"].remove(task_id)
        request(session, "instructor", "PUT", f"/api/projects/{project_id}", 200, json={**project_payload, "title": f"CRUD Project Updated {RUN_ID}", "status": "In Progress"})
        request(session, "instructor", "PATCH", f"/api/projects/{project_id}/status", 200, json={"status": "Completed"})
        assert comment["project_id"] == project_id, comment
        request(session, "admin", "DELETE", f"/api/projects/{project_id}", 200)
        CREATED["projects"].remove(project_id)

        # Teams router: team with nested member, detail, update, member add/remove, delete.
        team_payload = {
            "name": f"CRUD Team {RUN_ID}",
            "description": "Team CRUD payload",
            "department": "Integration Testing",
            "university": "CRUD Test University",
            "color_gradient": "from-blue-500 to-cyan-500",
            "leader_id": USER_IDS["instructor"],
            "members": [{"name": "Nested Member", "email": f"nested-{RUN_ID}@example.test", "role_in_team": "QA", "phone": "01000000000", "user_id": USER_IDS["student"]}],
        }
        team_id = request(session, "instructor", "POST", "/api/teams/", 200, json=team_payload).json()["team_id"]
        CREATED["teams"].append(team_id)
        detail = request(session, None, "GET", f"/api/teams/{team_id}", 200).json()
        assert detail["members_count"] == 1, detail
        nested_member_id = detail["members"][0]["id"]
        CREATED["members"].append(nested_member_id)
        request(session, "instructor", "PUT", f"/api/teams/{team_id}", 200, json={**team_payload, "name": f"CRUD Team Updated {RUN_ID}", "members": []})
        added_member_id = request(session, "instructor", "POST", f"/api/teams/{team_id}/members", 200, json={"name": "Added Member", "email": f"added-{RUN_ID}@example.test", "role_in_team": "Developer"}).json()["member_id"]
        CREATED["members"].append(added_member_id)
        request(session, "instructor", "DELETE", f"/api/teams/{team_id}/members/{added_member_id}", 200)
        CREATED["members"].remove(added_member_id)
        request(session, "instructor", "DELETE", f"/api/teams/{team_id}/members/{nested_member_id}", 200)
        CREATED["members"].remove(nested_member_id)
        request(session, "instructor", "DELETE", f"/api/teams/{team_id}", 200)
        CREATED["teams"].remove(team_id)

        # Meetings router: create attendee, detail, update, verify attendee, delete.
        meeting_payload = {
            "title": f"CRUD Meeting {RUN_ID}",
            "project_id": None,
            "session_id": None,
            "date": "2026-08-27",
            "time_range": "11:00 AM - 12:00 PM",
            "room": "Test Room",
            "notes": "Meeting CRUD payload",
            "status": "unverified",
            "attendees": [{"student_name": f"CRUD Student {RUN_ID}", "student_id": PROFILES["student"]["email"]}],
        }
        meeting_id = request(session, "instructor", "POST", "/api/meetings/", 200, json=meeting_payload).json()["meeting_id"]
        CREATED["meetings"].append(meeting_id)
        meeting_detail = request(session, None, "GET", f"/api/meetings/{meeting_id}", 200).json()
        assert len(meeting_detail["attendees"]) == 1, meeting_detail
        request(session, "instructor", "PUT", f"/api/meetings/{meeting_id}", 200, json={**meeting_payload, "title": f"CRUD Meeting Updated {RUN_ID}", "attendees": []})
        request(session, "staff", "POST", f"/api/meetings/{meeting_id}/verify", 200, json={"student_name": f"CRUD Student {RUN_ID}", "student_id": PROFILES["student"]["email"], "verification_method": "CRUD Test", "confidence": "100%"})
        request(session, "instructor", "DELETE", f"/api/meetings/{meeting_id}", 200)
        CREATED["meetings"].remove(meeting_id)

        # Settings router: authenticated self-service read/update/password and admin log read.
        request(session, "student", "GET", "/api/settings/me", 200)
        request(session, "student", "PUT", "/api/settings/me", 200, json={"theme": "light", "language": "en", "notif_plagiarism_alerts": False, "notif_meeting_reminders": True, "notif_project_updates": False})
        request(session, "student", "POST", "/api/settings/change-password", 200, json={"current_password": reset_password, "new_password": "CRUD-new-pass-456"})
        request(session, "admin", "GET", "/api/settings/logs", 200)

        # Notifications router: create, list, mark one, mark all.
        notification_id = request(session, "admin", "POST", "/api/notifications/", 200, json={"title": f"CRUD Notification {RUN_ID}", "description": "Notification CRUD payload", "notif_type": "info", "link_route": "/projects"}).json()["notification_id"]
        CREATED["notifications"].append(notification_id)
        request(session, "student", "GET", "/api/notifications/", 200, contains=str(notification_id))
        request(session, "student", "PATCH", f"/api/notifications/{notification_id}/read", 200)
        request(session, "student", "POST", "/api/notifications/read-all", 200)

        # Reports router: all four read-only analytics/report endpoints.
        for path in ("/api/reports/analytics", "/api/reports/completion-trends", "/api/reports/attendance-trends", "/api/reports/team-activity"):
            request(session, "admin", "GET", path, 200)
            request(session, "student", "GET", path, 403)

        print("FULL_CRUD_POSTGRES_PASS")
    finally:
        cleanup()


if __name__ == "__main__":
    main()
