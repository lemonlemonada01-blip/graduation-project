from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..dependencies import get_db, get_current_user
from ..database.models import Notification

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

class NotificationCreate(BaseModel):
    title: str
    description: str
    notif_type: str = "info"
    link_route: str = None

@router.get("/")
def get_notifications(db: Session = Depends(get_db)):
    notifications = db.query(Notification).order_by(Notification.created_at.desc()).all()
    unread_count = db.query(Notification).filter(Notification.is_read == 0).count()
    
    res = []
    for n in notifications:
        res.append({
            "id": n.id,
            "title": n.title,
            "description": n.description,
            "type": n.notif_type,
            "read": bool(n.is_read),
            "link": n.link_route,
            "time": n.created_at.isoformat() if n.created_at else None
        })
        
    return {"notifications": res, "unread_count": unread_count}

@router.post("/")
def create_notification(notif: NotificationCreate, db: Session = Depends(get_db)):
    new_notif = Notification(
        title=notif.title,
        description=notif.description,
        notif_type=notif.notif_type,
        link_route=notif.link_route
    )
    db.add(new_notif)
    db.commit()
    db.refresh(new_notif)
    return {"status": "ok", "notification_id": new_notif.id}

@router.patch("/{id}/read")
def mark_read(id: int, db: Session = Depends(get_db)):
    notif = db.query(Notification).filter(Notification.id == id).first()
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    notif.is_read = 1
    db.commit()
    return {"status": "ok", "message": "Notification marked as read"}

@router.post("/read-all")
def mark_all_read(db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.is_read == 0).update({"is_read": 1})
    db.commit()
    return {"status": "ok", "message": "All notifications marked as read"}
