from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..dependencies import get_db, require_roles
from ..database.models import User, UserPreference, AuditLog
from ..services.auth_service import verify_password, get_password_hash

router = APIRouter(prefix="/api/settings", tags=["Settings"])

@router.get("/me")
def get_me(db: Session = Depends(get_db), current_user: User = Depends(require_roles(["Admin", "Instructor", "Student", "Staff"]))):
    prefs = db.query(UserPreference).filter(UserPreference.user_id == current_user.id).first()
    if not prefs:
        prefs = UserPreference(
            user_id=current_user.id,
            theme="dark",
            language="en",
            notif_plagiarism_alerts=1,
            notif_meeting_reminders=1,
            notif_project_updates=1
        )
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
        
    return {
        "user": {
            "id": current_user.id,
            "name": current_user.full_name,
            "email": current_user.email,
            "role": current_user.role,
            "department": current_user.department,
            "university": current_user.university
        },
        "preferences": {
            "theme": prefs.theme,
            "language": prefs.language,
            "notif_plagiarism_alerts": bool(prefs.notif_plagiarism_alerts),
            "notif_meeting_reminders": bool(prefs.notif_meeting_reminders),
            "notif_project_updates": bool(prefs.notif_project_updates)
        }
    }

@router.put("/me")
def update_me(prefs_data: dict, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["Admin", "Instructor", "Student", "Staff"]))):
    prefs = db.query(UserPreference).filter(UserPreference.user_id == current_user.id).first()
    if not prefs:
        prefs = UserPreference(user_id=current_user.id)
        db.add(prefs)
        
    if "theme" in prefs_data:
        prefs.theme = prefs_data["theme"]
    if "language" in prefs_data:
        prefs.language = prefs_data["language"]
    if "notif_plagiarism_alerts" in prefs_data:
        prefs.notif_plagiarism_alerts = int(prefs_data["notif_plagiarism_alerts"])
    if "notif_meeting_reminders" in prefs_data:
        prefs.notif_meeting_reminders = int(prefs_data["notif_meeting_reminders"])
    if "notif_project_updates" in prefs_data:
        prefs.notif_project_updates = int(prefs_data["notif_project_updates"])
        
    db.commit()
    
    return {
        "status": "ok",
        "message": "Preferences updated successfully"
    }

@router.post("/change-password")
def change_password(data: dict, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["Admin", "Instructor", "Student", "Staff"]))):
    current_password = data.get("current_password")
    new_password = data.get("new_password")
    
    if not current_password or not new_password:
        raise HTTPException(status_code=400, detail="Both current and new passwords are required")
        
    if not verify_password(current_password, current_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid current password")
        
    current_user.hashed_password = get_password_hash(new_password)
    db.commit()
    
    return {
        "status": "ok",
        "message": "Password changed successfully"
    }

@router.get("/logs")
def get_logs(db: Session = Depends(get_db), current_user=Depends(require_roles(["Admin", "Instructor"]))):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).all()
    result = []
    for log in logs:
        result.append({
            "id": log.id,
            "action": log.action,
            "details": log.details,
            "user": log.user_name,
            "ip": log.ip_address,
            "timestamp": log.created_at
        })
        
    return {"logs": result}
