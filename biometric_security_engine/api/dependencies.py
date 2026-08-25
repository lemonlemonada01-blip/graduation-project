import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from .config import settings
from .database.connection import get_db_connection, get_rbac_db
from .database.models import User, UserRole

security = HTTPBearer(auto_error=False)

def get_db():
    """Dependency that returns an SQLAlchemy Session for the RBAC database."""
    db = next(get_rbac_db())
    try:
        yield db
    finally:
        db.close()


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    if not credentials:
        # In this phase, we allow unauthenticated access to mimic current behavior (or raise 401 if strict)
        # We will return None or raise HTTP 401 based on requirement.
        # But Phase 1 instructions say "extracts and validates JWT from Authorization header"
        # Since earlier we used fake auth in most endpoints, I'll return None if no token.
        return None
    
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        student_id: str = payload.get("sub")
        if student_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    # Try fetching user from DB - only compare with id if the subject looks numeric
    if student_id.isdigit():
        user = db.query(User).filter((User.email == student_id) | (User.id == int(student_id))).first()
    else:
        user = db.query(User).filter(User.email == student_id).first()
    if not user:
        # Create a fake user object for Biometric students who aren't in RBAC DB yet
        # or just return the student_id
        return {"student_id": student_id, "role": "Student"}
        
    return user

def require_role(required_role: str):
    def role_checker(current_user = Depends(get_current_user)):
        if not current_user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        user_role = current_user.role if hasattr(current_user, 'role') else current_user.get('role')
        if user_role != required_role:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        return current_user
    return role_checker
