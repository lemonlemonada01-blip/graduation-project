from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..dependencies import get_db, require_roles
from ..database.models import *
import uuid
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/api/projects", tags=["Projects"])

class ProjectCreate(BaseModel):
    title: str
    abstract: Optional[str] = None
    domain: Optional[str] = None
    status: Optional[str] = "Proposed"
    supervisor_name: Optional[str] = None
    department: Optional[str] = None
    university: Optional[str] = None
    academic_year: Optional[str] = None

class ProjectStatusUpdate(BaseModel):
    status: str

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "To Do"
    priority: Optional[str] = "Medium"
    category: Optional[str] = "General"
    assignee_name: Optional[str] = None

class CommentCreate(BaseModel):
    user_id: Optional[int] = None
    content: str

@router.get("/")
def list_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).all()
    result = []
    for p in projects:
        tasks_count = db.query(ProjectTask).filter(ProjectTask.project_id == p.id).count()
        deliv_count = db.query(ProjectDeliverable).filter(ProjectDeliverable.project_id == p.id).count()
        result.append({
            "id": p.id,
            "title": p.title,
            "abstract": p.abstract,
            "domain": p.domain,
            "status": p.status,
            "supervisor_name": p.supervisor_name,
            "department": p.department,
            "university": p.university,
            "academic_year": p.academic_year,
            "progress_percentage": p.progress_percentage,
            "tasks_count": tasks_count,
            "deliverables_count": deliv_count,
            "created_at": p.created_at
        })
    return {"projects": result}

@router.get("/{id}")
def get_project(id: str, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    
    tasks = db.query(ProjectTask).filter(ProjectTask.project_id == id).all()
    deliverables = db.query(ProjectDeliverable).filter(ProjectDeliverable.project_id == id).all()
    comments = db.query(ProjectComment).filter(ProjectComment.project_id == id).all()
    
    return {
        "id": p.id,
        "title": p.title,
        "abstract": p.abstract,
        "domain": p.domain,
        "status": p.status,
        "supervisor_name": p.supervisor_name,
        "department": p.department,
        "university": p.university,
        "academic_year": p.academic_year,
        "progress_percentage": p.progress_percentage,
        "tasks": [{"id": t.id, "project_id": t.project_id, "title": t.title, "description": t.description, "status": t.status, "priority": t.priority, "category": t.category, "assignee_name": t.assignee_name, "order_index": t.order_index} for t in tasks],
        "deliverables": [{"id": d.id, "name": d.name, "file_path": d.file_path, "file_size": d.file_size, "file_type": d.file_type, "uploader_name": d.uploader_name, "uploaded_at": d.uploaded_at} for d in deliverables],
        "comments": [{"id": c.id, "user_id": c.user_id, "content": c.content, "created_at": c.created_at, "author_name": c.author.full_name if c.author else None} for c in comments]
    }

@router.post("/")
def create_project(data: ProjectCreate, db: Session = Depends(get_db), current_user=Depends(require_roles(["Admin", "Instructor", "Student"]))):
    pid = f"P-{uuid.uuid4().hex[:8]}"
    p = Project(
        id=pid,
        title=data.title,
        abstract=data.abstract,
        domain=data.domain,
        status=data.status,
        supervisor_name=data.supervisor_name,
        department=data.department,
        university=data.university,
        academic_year=data.academic_year
    )
    db.add(p)
    db.commit()
    return {"status": "ok", "project_id": pid, "title": p.title}

@router.put("/{id}")
def update_project(id: str, data: ProjectCreate, db: Session = Depends(get_db), current_user=Depends(require_roles(["Admin", "Instructor"]))):
    p = db.query(Project).filter(Project.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    
    p.title = data.title
    p.abstract = data.abstract
    p.domain = data.domain
    p.status = data.status
    p.supervisor_name = data.supervisor_name
    p.department = data.department
    p.university = data.university
    p.academic_year = data.academic_year
    db.commit()
    return {"status": "ok", "message": "Project updated"}

@router.patch("/{id}/status")
def update_project_status(id: str, data: ProjectStatusUpdate, db: Session = Depends(get_db), current_user=Depends(require_roles(["Admin", "Instructor"]))):
    p = db.query(Project).filter(Project.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    
    p.status = data.status
    db.commit()
    return {"status": "ok", "project_id": id}

@router.delete("/{id}")
def delete_project(id: str, db: Session = Depends(get_db), current_user=Depends(require_roles(["Admin"]))):
    p = db.query(Project).filter(Project.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db.delete(p)
    db.commit()
    return {"status": "ok", "message": "Project deleted"}

@router.get("/{id}/tasks")
def get_project_tasks(id: str, db: Session = Depends(get_db)):
    tasks = db.query(ProjectTask).filter(ProjectTask.project_id == id).all()
    return [{"id": t.id, "project_id": t.project_id, "title": t.title, "description": t.description, "status": t.status, "priority": t.priority, "category": t.category, "assignee_name": t.assignee_name, "order_index": t.order_index} for t in tasks]

@router.post("/{id}/tasks")
def create_task(id: str, data: TaskCreate, db: Session = Depends(get_db), current_user=Depends(require_roles(["Admin", "Instructor"]))):
    t = ProjectTask(
        project_id=id,
        title=data.title,
        description=data.description,
        status=data.status,
        priority=data.priority,
        category=data.category,
        assignee_name=data.assignee_name
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return {"status": "ok", "task_id": t.id}

@router.put("/{id}/tasks/{task_id}")
def update_task(id: str, task_id: int, data: TaskCreate, db: Session = Depends(get_db), current_user=Depends(require_roles(["Admin", "Instructor"]))):
    t = db.query(ProjectTask).filter(ProjectTask.id == task_id, ProjectTask.project_id == id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    
    t.title = data.title
    t.description = data.description
    t.status = data.status
    t.priority = data.priority
    t.category = data.category
    t.assignee_name = data.assignee_name
    db.commit()
    return {"status": "ok", "message": "Task updated"}

@router.delete("/{id}/tasks/{task_id}")
def delete_task(id: str, task_id: int, db: Session = Depends(get_db), current_user=Depends(require_roles(["Admin", "Instructor"]))):
    t = db.query(ProjectTask).filter(ProjectTask.id == task_id, ProjectTask.project_id == id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    
    db.delete(t)
    db.commit()
    return {"status": "ok", "message": "Task deleted"}

@router.get("/{id}/comments")
def get_project_comments(id: str, db: Session = Depends(get_db)):
    comments = db.query(ProjectComment).filter(ProjectComment.project_id == id).all()
    return [{"id": c.id, "project_id": c.project_id, "user_id": c.user_id, "content": c.content, "created_at": c.created_at, "author_name": c.author.full_name if c.author else None} for c in comments]

@router.post("/{id}/comments")
def add_project_comment(id: str, data: CommentCreate, db: Session = Depends(get_db), current_user=Depends(require_roles(["Admin", "Instructor", "Student"]))):
    authenticated_user_id = current_user.id if hasattr(current_user, "id") else data.user_id
    if not authenticated_user_id:
        raise HTTPException(status_code=401, detail="A database-backed user is required to post comments")

    c = ProjectComment(
        project_id=id,
        user_id=authenticated_user_id,
        content=data.content,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return {
        "id": c.id,
        "project_id": c.project_id,
        "user_id": c.user_id,
        "content": c.content,
        "created_at": c.created_at,
        "author_name": c.author.full_name if c.author else None,
    }
