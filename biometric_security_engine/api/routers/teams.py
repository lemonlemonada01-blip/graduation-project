from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..dependencies import get_db, require_roles
from ..database.models import *
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/api/teams", tags=["Teams"])

class TeamMemberCreate(BaseModel):
    name: str
    email: Optional[str] = None
    role_in_team: Optional[str] = "Member"
    phone: Optional[str] = None
    user_id: Optional[int] = None

class TeamCreate(BaseModel):
    name: str
    description: Optional[str] = None
    department: Optional[str] = None
    university: Optional[str] = None
    color_gradient: Optional[str] = None
    leader_id: Optional[int] = None
    members: Optional[List[TeamMemberCreate]] = []

@router.get("/")
def list_teams(db: Session = Depends(get_db)):
    teams = db.query(Team).all()
    result = []
    for t in teams:
        members_count = len(t.members)
        result.append({
            "id": t.id,
            "name": t.name,
            "description": t.description,
            "department": t.department,
            "university": t.university,
            "color_gradient": t.color_gradient,
            "leader_id": t.leader_id,
            "members_count": members_count,
            "members": [{"id": m.id, "team_id": m.team_id, "user_id": m.user_id, "name": m.name, "email": m.email, "role": m.role_in_team, "phone": m.phone, "initials": m.initials} for m in t.members]
        })
    return {"teams": result}

@router.get("/{id}")
def get_team(id: int, db: Session = Depends(get_db)):
    t = db.query(Team).filter(Team.id == id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Team not found")
    
    return {
        "id": t.id,
        "name": t.name,
        "description": t.description,
        "department": t.department,
        "university": t.university,
        "color_gradient": t.color_gradient,
        "leader_id": t.leader_id,
        "members_count": len(t.members),
        "members": [{"id": m.id, "team_id": m.team_id, "user_id": m.user_id, "name": m.name, "email": m.email, "role": m.role_in_team, "phone": m.phone, "initials": m.initials} for m in t.members]
    }

@router.post("/")
def create_team(data: TeamCreate, db: Session = Depends(get_db), current_user=Depends(require_roles(["Admin", "Instructor"]))):
    t = Team(
        name=data.name,
        description=data.description,
        department=data.department,
        university=data.university,
        color_gradient=data.color_gradient,
        leader_id=data.leader_id
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    
    if data.members:
        for m_data in data.members:
            m = TeamMember(
                team_id=t.id,
                user_id=m_data.user_id,
                name=m_data.name,
                email=m_data.email,
                role_in_team=m_data.role_in_team,
                phone=m_data.phone,
                initials=m_data.name[:2].upper() if m_data.name else None
            )
            db.add(m)
        db.commit()

    return {"status": "ok", "team_id": t.id, "name": t.name}

@router.put("/{id}")
def update_team(id: int, data: TeamCreate, db: Session = Depends(get_db), current_user=Depends(require_roles(["Admin", "Instructor"]))):
    t = db.query(Team).filter(Team.id == id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Team not found")
    
    t.name = data.name
    t.description = data.description
    t.department = data.department
    t.university = data.university
    t.color_gradient = data.color_gradient
    t.leader_id = data.leader_id
    db.commit()
    return {"status": "ok", "message": "Team updated"}

@router.delete("/{id}")
def delete_team(id: int, db: Session = Depends(get_db), current_user=Depends(require_roles(["Admin", "Instructor"]))):
    t = db.query(Team).filter(Team.id == id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Team not found")
    
    db.delete(t)
    db.commit()
    return {"status": "ok", "message": "Team deleted"}

@router.post("/{id}/members")
def add_team_member(id: int, data: TeamMemberCreate, db: Session = Depends(get_db), current_user=Depends(require_roles(["Admin", "Instructor"]))):
    m = TeamMember(
        team_id=id,
        user_id=data.user_id,
        name=data.name,
        email=data.email,
        role_in_team=data.role_in_team,
        phone=data.phone,
        initials=data.name[:2].upper() if data.name else None
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return {"status": "ok", "member_id": m.id}

@router.delete("/{id}/members/{member_id}")
def remove_team_member(id: int, member_id: int, db: Session = Depends(get_db), current_user=Depends(require_roles(["Admin", "Instructor"]))):
    m = db.query(TeamMember).filter(TeamMember.id == member_id, TeamMember.team_id == id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")
    
    db.delete(m)
    db.commit()
    return {"status": "ok", "message": "Member removed"}
