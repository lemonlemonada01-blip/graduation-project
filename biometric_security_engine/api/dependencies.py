from __future__ import annotations

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .config import settings
from .database.connection import get_rbac_db
from .database.models import User

security = HTTPBearer(auto_error=False)


def get_db():
    """Yield the request-scoped SQLAlchemy session without closing it early."""

    yield from get_rbac_db()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    if not credentials:
        return None

    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        student_id = payload.get("sub")
        if student_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials") from exc

    student_id = str(student_id)
    query = db.query(User).filter(User.email == student_id)
    user = query.first()
    if user is None and student_id.isdigit():
        user = db.query(User).filter(User.id == int(student_id)).first()

    # Preserve the existing permissive behavior for biometric-only students.
    return user or {"student_id": student_id, "role": "Student"}


def require_role(required_role: str):
    def role_checker(current_user=Depends(get_current_user)):
        if not current_user:
            raise HTTPException(status_code=401, detail="Not authenticated")

        user_role = current_user.role if hasattr(current_user, "role") else current_user.get("role")
        if user_role != required_role:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        return current_user

    return role_checker
