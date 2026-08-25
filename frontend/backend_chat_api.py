from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.sql import func
from pydantic import BaseModel
from typing import List
from datetime import datetime

# --- Database Setup (SQLAlchemy) ---
DATABASE_URL = "sqlite:///./biometric_security.db" # Replace with your PostgreSQL URL e.g. postgresql://user:password@localhost/dbname
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False}) # check_same_thread only for sqlite
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- Models ---
class ProjectComment(Base):
    __tablename__ = "project_comments"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String, index=True, nullable=False) # UUID or string depending on your project ID type
    user_id = Column(String, nullable=False) # Who posted the comment
    content = Column(String, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

# Create tables
Base.metadata.create_all(bind=engine)

# --- Pydantic Schemas ---
class CommentBase(BaseModel):
    content: str
    user_id: str # Ideally, extract this from the authenticated user token

class CommentCreate(CommentBase):
    pass

class CommentResponse(CommentBase):
    id: int
    project_id: str
    timestamp: datetime

    class Config:
        from_attributes = True

# --- FastAPI App ---
app = FastAPI(title="Secure-FEPRH Chat API")

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Routes ---

@app.get("/api/projects/{project_id}/comments", response_model=List[CommentResponse])
def get_comments(project_id: str, db: Session = Depends(get_db)):
    """
    Fetch all comments for a specific project, ordered by newest first.
    """
    comments = db.query(ProjectComment)\
                 .filter(ProjectComment.project_id == project_id)\
                 .order_by(ProjectComment.timestamp.desc())\
                 .all()
    return comments

@app.post("/api/projects/{project_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
def create_comment(project_id: str, comment: CommentCreate, db: Session = Depends(get_db)):
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
    return new_comment
