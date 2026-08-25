from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..dependencies import get_db, get_current_user
from ..database.models import (
    Project, Meeting, User, Team, PlagiarismScanReport, SessionAttendanceRecord
)

router = APIRouter(prefix="/api/reports", tags=["Reports"])

@router.get("/analytics")
def get_analytics(db: Session = Depends(get_db)):
    total_projects = db.query(func.count(Project.id)).scalar() or 0
    active_projects = db.query(func.count(Project.id)).filter(Project.status == "In Progress").scalar() or 0
    completed_projects = db.query(func.count(Project.id)).filter(Project.status == "Completed").scalar() or 0
    total_meetings = db.query(func.count(Meeting.id)).scalar() or 0
    verified_meetings = db.query(func.count(Meeting.id)).filter(Meeting.status == "verified").scalar() or 0
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_teams = db.query(func.count(Team.id)).scalar() or 0
    total_scans = db.query(func.count(PlagiarismScanReport.id)).scalar() or 0
    
    avg_similarity = db.query(func.avg(PlagiarismScanReport.overall_similarity)).scalar() or 0
    flagged_cases = db.query(func.count(PlagiarismScanReport.id)).filter(PlagiarismScanReport.verdict == "FLAGGED").scalar() or 0
    
    total_attendance = db.query(func.count(SessionAttendanceRecord.id)).scalar() or 0
    present_attendance = db.query(func.count(SessionAttendanceRecord.id)).filter(SessionAttendanceRecord.status == "Present").scalar() or 0
    
    attendance_rate = 0
    if total_attendance > 0:
        attendance_rate = (present_attendance / total_attendance) * 100
        
    attendance_rate_str = f"{attendance_rate:.1f}%"
    
    domains = db.query(Project.domain, func.count(Project.id)).group_by(Project.domain).all()
    domain_dist = []
    if total_projects > 0:
        for domain, count in domains:
            domain_dist.append({
                "domain": domain or "Unknown",
                "count": count,
                "percentage": round((count / total_projects) * 100, 1)
            })
            
    statuses = db.query(Project.status, func.count(Project.id)).group_by(Project.status).all()
    status_dist = {status or "Unknown": count for status, count in statuses}

    return {
        "kpis": {
            "total_projects": total_projects,
            "active_projects": active_projects,
            "completed_projects": completed_projects,
            "total_meetings": total_meetings,
            "verified_meetings": verified_meetings,
            "attendance_rate": attendance_rate_str,
            "total_users": total_users,
            "total_teams": total_teams,
            "total_scans": total_scans,
            "avg_plagiarism_similarity": f"{avg_similarity:.1f}%"
        },
        "domain_distribution": domain_dist,
        "total_projects": total_projects,
        "flagged_plagiarism_cases": flagged_cases,
        "avg_attendance_rate": round(attendance_rate, 1),
        "project_status_distribution": status_dist
    }

@router.get("/completion-trends")
def get_completion_trends(db: Session = Depends(get_db)):
    return {
        "monthly": [
            {"month": "Jan", "completed": 2, "target": 5},
            {"month": "Feb", "completed": 3, "target": 5},
            {"month": "Mar", "completed": 5, "target": 6},
            {"month": "Apr", "completed": 7, "target": 6},
            {"month": "May", "completed": 10, "target": 8},
        ]
    }

@router.get("/attendance-trends")
def get_attendance_trends(db: Session = Depends(get_db)):
    return {
        "trend": [
            {"name": "Week 1", "Present": 25, "Late": 3, "Absent": 2},
            {"name": "Week 2", "Present": 26, "Late": 2, "Absent": 2},
            {"name": "Week 3", "Present": 28, "Late": 1, "Absent": 1},
            {"name": "Week 4", "Present": 27, "Late": 2, "Absent": 1},
        ]
    }

@router.get("/team-activity")
def get_team_activity(db: Session = Depends(get_db)):
    teams = db.query(Team).all()
    result = []
    for t in teams:
        result.append({
            "team": t.name,
            "department": t.department,
            "members": len(t.members) if t.members else 0,
            "tasks_completed": 12, # Mock value
            "status": "Active"
        })
    return {"teams": result}
