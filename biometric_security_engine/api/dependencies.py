from __future__ import annotations

from collections.abc import Iterable

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .config import settings
from .database.connection import get_rbac_db
from .database.models import User

security = HTTPBearer(auto_error=False)

# Friendly role names used by the UI/API are mapped to the canonical database
# roles already used by the project.
ROLE_ALIASES = {
    "ADMIN": {"ADMIN", "MINISTRY ADMIN", "UNIVERSITY ADMIN"},
    "INSTRUCTOR": {"INSTRUCTOR", "SUPERVISOR", "FACULTY MEMBER"},
    "STUDENT": {"STUDENT"},
    "STAFF": {"STAFF", "ADMINISTRATIVE STAFF", "SECURITY PERSONNEL"},
}


def get_db():
    """Yield the request-scoped SQLAlchemy session without closing it early."""

    yield from get_rbac_db()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    if not credentials:
        return None

    try:
        payload = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        subject = payload.get("sub")
        if subject is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials") from exc

    subject = str(subject)
    user = db.query(User).filter(User.email == subject).first()
    if user is None and subject.isdigit():
        user = db.query(User).filter(User.id == int(subject)).first()

    # Preserve biometric-only users while still allowing protected endpoints to
    # reject them when no database-backed role is available.
    return user or {"student_id": subject, "role": "Student"}


def _role_values(role: str) -> set[str]:
    normalized = str(role or "").strip().upper()
    for canonical, values in ROLE_ALIASES.items():
        if normalized == canonical or normalized in values:
            return values
    return {normalized}


def _role_allowed(actual_role: str, allowed_roles: Iterable[str]) -> bool:
    actual_values = _role_values(actual_role)
    return any(actual_values.intersection(_role_values(role)) for role in allowed_roles)


def require_roles(allowed_roles: Iterable[str]):
    """Return a FastAPI dependency that requires one of ``allowed_roles``.

    Examples:
        ``Depends(require_roles(["Admin", "Instructor"]))``
        ``Depends(require_roles(["Admin", "Instructor", "Student"]))``
    """

    allowed = tuple(allowed_roles)
    if not allowed:
        raise ValueError("At least one allowed role is required")

    def role_checker(current_user=Depends(get_current_user)):
        if not current_user:
            raise HTTPException(status_code=401, detail="Not authenticated")

        actual_role = current_user.role if hasattr(current_user, "role") else current_user.get("role")
        if not _role_allowed(actual_role, allowed):
            raise HTTPException(status_code=403, detail="You do not have permission to perform this action")
        return current_user

    return role_checker


def require_role(required_role: str):
    """Backward-compatible single-role wrapper."""

    return require_roles([required_role])
