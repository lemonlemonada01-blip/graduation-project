from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, create_engine, Enum, Table, Text
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship
from sqlalchemy.sql import func
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import enum

# --- Database Setup (SQLAlchemy) ---
DATABASE_URL = "sqlite:///./biometric_security.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- Enums ---
class UserRole(str, enum.Enum):
    MINISTRY_ADMIN = "Ministry Admin"
    UNIVERSITY_ADMIN = "University Admin"
    SUPERVISOR = "Supervisor"
    STUDENT = "Student"

# --- Models ---
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False) # In real app, this would be hashed
    role = Column(Enum(UserRole), nullable=False)
    university = Column(String, nullable=True)
    department = Column(String, nullable=True)
    
    comments = relationship("ProjectComment", back_populates="author")

class ProjectComment(Base):
    __tablename__ = "project_comments"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    author = relationship("User", back_populates="comments")

# Create tables
Base.metadata.create_all(bind=engine)

# --- Role Permissions Mapping ---
# Dictionary mapping specific roles to granular permissions
ROLE_PERMISSIONS = {
    UserRole.MINISTRY_ADMIN: [
        "manage_all_universities",
        "system_configuration",
        "approve_global_projects",
        "view_all_reports",
        "provision_admins"
    ],
    UserRole.UNIVERSITY_ADMIN: [
        "manage_department_users",
        "approve_department_projects",
        "view_university_reports",
        "manage_role_assignments"
    ],
    UserRole.SUPERVISOR: [
        "propose_projects",
        "grade_student_submissions",
        "view_plagiarism_reports",
        "schedule_meetings"
    ],
    UserRole.STUDENT: [
        "submit_project_proposals",
        "upload_deliverables",
        "view_own_grades",
        "join_meetings"
    ]
}

# --- Pydantic Schemas ---
class UserCreate(BaseModel):
    full_name: str
    email: str
    password: str
    role: UserRole
    university: Optional[str] = None
    department: Optional[str] = None
    
class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: UserRole
    permissions: List[str]
    
    class Config:
        from_attributes = True

class CommentBase(BaseModel):
    content: str
    user_id: int

class CommentCreate(CommentBase):
    pass

class CommentResponse(CommentBase):
    id: int
    project_id: str
    created_at: datetime
    author_name: str

    class Config:
        from_attributes = True

# --- FastAPI App ---
app = FastAPI(title="Secure-FEPRH API (Chat & RBAC)")

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Dummy dependency to simulate current logged in user (in real app, extract from JWT)
def get_current_user(db: Session = Depends(get_db)):
    # For demonstration, assume Ministry Admin is calling the provision route
    admin = db.query(User).filter(User.role == UserRole.MINISTRY_ADMIN).first()
    if not admin:
        # Create a default admin if none exists just for this mock to work
        admin = User(full_name="System Admin", email="admin@system.com", hashed_password="fake", role=UserRole.MINISTRY_ADMIN)
        db.add(admin)
        db.commit()
        db.refresh(admin)
    return admin

# --- Routes ---

# 1. User Provisioning Route (RBAC)
@app.post("/api/users/provision", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def provision_user(
    user_data: UserCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Allows a high-level admin to create a sub-admin and securely assign their role.
    """
    # Enforce RBAC: Only Ministry Admin or University Admin can provision users
    if current_user.role not in [UserRole.MINISTRY_ADMIN, UserRole.UNIVERSITY_ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized to provision users")
        
    # Additional logic: University Admin can only provision Supervisors and Students
    if current_user.role == UserRole.UNIVERSITY_ADMIN and user_data.role in [UserRole.MINISTRY_ADMIN, UserRole.UNIVERSITY_ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized to provision admins")
        
    # Check if email exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    new_user = User(
        full_name=user_data.full_name,
        email=user_data.email,
        hashed_password=user_data.password, # Note: Should hash in production
        role=user_data.role,
        university=user_data.university,
        department=user_data.department
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {
        **new_user.__dict__,
        "permissions": ROLE_PERMISSIONS.get(new_user.role, [])
    }

# 2. Project Chat Routes
@app.get("/api/projects/{project_id}/comments", response_model=List[CommentResponse])
def get_comments(project_id: str, db: Session = Depends(get_db)):
    """
    Fetch all comments for a specific project, ordered by newest first.
    """
    comments = db.query(ProjectComment)\
                 .filter(ProjectComment.project_id == project_id)\
                 .order_by(ProjectComment.created_at.desc())\
                 .all()
                 
    # Map author_name from relations
    response_data = []
    for comment in comments:
        response_data.append({
            "id": comment.id,
            "project_id": comment.project_id,
            "user_id": comment.user_id,
            "content": comment.content,
            "created_at": comment.created_at,
            "author_name": comment.author.full_name if comment.author else "Unknown"
        })
    return response_data

@app.post("/api/projects/{project_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
def create_comment(
    project_id: str, 
    comment: CommentCreate, 
    db: Session = Depends(get_db)
):
    """
    Post a new comment to a specific project.
    """
    new_comment = ProjectComment(
        project_id=project_id,
        user_id=comment.user_id,
        content=comment.content
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    
    # Reload with author relation
    db.refresh(new_comment, ['author'])
    
    return {
        "id": new_comment.id,
        "project_id": new_comment.project_id,
        "user_id": new_comment.user_id,
        "content": new_comment.content,
        "created_at": new_comment.created_at,
        "author_name": new_comment.author.full_name if new_comment.author else "Unknown"
    }
