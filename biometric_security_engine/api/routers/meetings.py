from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..dependencies import get_db, get_current_user
from ..database.models import *
from pydantic import BaseModel
from typing import List, Optional
import datetime

router = APIRouter(prefix="/api/meetings", tags=["Meetings"])

class AttendeeCreate(BaseModel):
    student_name: str
    student_id: Optional[str] = None

class MeetingCreate(BaseModel):
    title: str
    project_id: Optional[str] = None
    session_id: Optional[str] = None
    date: str
    time_range: Optional[str] = None
    room: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = "unverified"
    attendees: Optional[List[AttendeeCreate]] = []

class VerifyAttendee(BaseModel):
    student_name: str
    student_id: Optional[str] = None
    verification_method: Optional[str] = "3D Biometric"
    confidence: Optional[str] = "99.9%"

@router.get("/")
def list_meetings(db: Session = Depends(get_db)):
    meetings = db.query(Meeting).all()
    result = []
    for m in meetings:
        result.append({
            "id": m.id,
            "title": m.title,
            "project_id": m.project_id,
            "session_id": m.session_id,
            "date": m.date,
            "time_range": m.time_range,
            "room": m.room,
            "notes": m.notes,
            "status": m.status,
            "attendees": [{"id": a.id, "meeting_id": a.meeting_id, "student_name": a.student_name, "student_id": a.student_id, "is_verified": bool(a.is_verified), "verification_method": a.verification_method, "confidence": a.confidence, "timestamp": a.timestamp} for a in m.attendees]
        })
    return {"meetings": result}

@router.get("/{id}")
def get_meeting(id: int, db: Session = Depends(get_db)):
    m = db.query(Meeting).filter(Meeting.id == id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    return {
        "id": m.id,
        "title": m.title,
        "project_id": m.project_id,
        "session_id": m.session_id,
        "date": m.date,
        "time_range": m.time_range,
        "room": m.room,
        "notes": m.notes,
        "status": m.status,
        "attendees": [{"id": a.id, "meeting_id": a.meeting_id, "student_name": a.student_name, "student_id": a.student_id, "is_verified": bool(a.is_verified), "verification_method": a.verification_method, "confidence": a.confidence, "timestamp": a.timestamp} for a in m.attendees]
    }

@router.post("/")
def create_meeting(data: MeetingCreate, db: Session = Depends(get_db)):
    m = Meeting(
        title=data.title,
        project_id=data.project_id,
        session_id=data.session_id,
        date=data.date,
        time_range=data.time_range,
        room=data.room,
        notes=data.notes,
        status=data.status
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    
    if data.attendees:
        for a_data in data.attendees:
            a = MeetingAttendee(
                meeting_id=m.id,
                student_name=a_data.student_name,
                student_id=a_data.student_id
            )
            db.add(a)
        db.commit()

    return {"status": "ok", "meeting_id": m.id, "title": m.title}

@router.put("/{id}")
def update_meeting(id: int, data: MeetingCreate, db: Session = Depends(get_db)):
    m = db.query(Meeting).filter(Meeting.id == id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    m.title = data.title
    m.project_id = data.project_id
    m.session_id = data.session_id
    m.date = data.date
    m.time_range = data.time_range
    m.room = data.room
    m.notes = data.notes
    m.status = data.status
    db.commit()
    return {"status": "ok", "message": "Meeting updated"}

@router.delete("/{id}")
def delete_meeting(id: int, db: Session = Depends(get_db)):
    m = db.query(Meeting).filter(Meeting.id == id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    db.delete(m)
    db.commit()
    return {"status": "ok", "message": "Meeting deleted"}

@router.post("/{id}/verify")
def verify_attendee(id: int, data: VerifyAttendee, db: Session = Depends(get_db)):
    m = db.query(Meeting).filter(Meeting.id == id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    a = None
    if data.student_id:
        a = db.query(MeetingAttendee).filter(MeetingAttendee.meeting_id == id, MeetingAttendee.student_id == data.student_id).first()
    if not a:
        a = db.query(MeetingAttendee).filter(MeetingAttendee.meeting_id == id, MeetingAttendee.student_name == data.student_name).first()
    
    if not a:
        raise HTTPException(status_code=404, detail="Attendee not found in meeting")
    
    a.is_verified = 1
    a.verification_method = data.verification_method
    a.confidence = data.confidence
    a.timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    db.commit()

    # Update meeting status
    db.refresh(m)
    all_verified = all(att.is_verified == 1 for att in m.attendees)
    any_verified = any(att.is_verified == 1 for att in m.attendees)
    if all_verified:
        m.status = "verified"
    elif any_verified:
        m.status = "partial"
    else:
        m.status = "unverified"
    db.commit()

    return {"status": "ok", "message": "Attendee verified", "meeting_status": m.status}
