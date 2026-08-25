from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..dependencies import get_db, get_current_user
from ..database.models import AcademicSession, SessionAttendanceRecord
import datetime

router = APIRouter(prefix="/api/sessions", tags=["Sessions"])

@router.get("/")
def get_sessions(db: Session = Depends(get_db)):
    sessions = db.query(AcademicSession).all()
    result = []
    for s in sessions:
        roster = []
        for r in s.records:
            roster.append({
                "id": r.id,
                "sessionId": r.session_id,
                "studentId": r.student_id,
                "studentName": r.student_name,
                "status": r.status,
                "verificationMethod": r.verification_method,
                "confidence": r.confidence,
                "timestamp": r.timestamp
            })
            
        result.append({
            "id": s.id,
            "courseCode": s.course_code,
            "courseName": s.course_name,
            "type": s.session_type,
            "room": s.room,
            "date": s.date,
            "timeRange": s.time_range,
            "gracePeriod": s.grace_period,
            "enrolled": s.enrolled,
            "status": s.status,
            "roster": roster
        })
        
    return {"sessions": result}

@router.post("/")
def create_session(session_data: dict, db: Session = Depends(get_db)):
    new_session = AcademicSession(
        id=session_data.get("id"),
        course_code=session_data.get("course_code"),
        course_name=session_data.get("course_name"),
        session_type=session_data.get("session_type", "Lecture"),
        room=session_data.get("room"),
        date=session_data.get("date"),
        time_range=session_data.get("time_range"),
        grace_period=session_data.get("grace_period", 15),
        enrolled=session_data.get("enrolled", 0),
        status=session_data.get("status", "Upcoming")
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    
    return {
        "status": "ok",
        "message": "Session created successfully",
        "session": {
            "id": new_session.id,
            "courseCode": new_session.course_code,
            "courseName": new_session.course_name,
            "type": new_session.session_type,
            "room": new_session.room,
            "date": new_session.date,
            "timeRange": new_session.time_range,
            "gracePeriod": new_session.grace_period,
            "enrolled": new_session.enrolled,
            "status": new_session.status
        }
    }

@router.put("/{id}")
def update_session(id: str, session_data: dict, db: Session = Depends(get_db)):
    session = db.query(AcademicSession).filter(AcademicSession.id == id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if "course_code" in session_data:
        session.course_code = session_data["course_code"]
    if "course_name" in session_data:
        session.course_name = session_data["course_name"]
    if "session_type" in session_data:
        session.session_type = session_data["session_type"]
    if "room" in session_data:
        session.room = session_data["room"]
    if "date" in session_data:
        session.date = session_data["date"]
    if "time_range" in session_data:
        session.time_range = session_data["time_range"]
    if "grace_period" in session_data:
        session.grace_period = session_data["grace_period"]
    if "enrolled" in session_data:
        session.enrolled = session_data["enrolled"]
    if "status" in session_data:
        session.status = session_data["status"]
        
    db.commit()
    
    return {
        "status": "ok",
        "message": "Session updated successfully"
    }

@router.delete("/{id}")
def delete_session(id: str, db: Session = Depends(get_db)):
    session = db.query(AcademicSession).filter(AcademicSession.id == id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    db.delete(session)
    db.commit()
    
    return {
        "status": "ok",
        "message": "Session deleted successfully"
    }

@router.get("/{id}/roster")
def get_session_roster(id: str, db: Session = Depends(get_db)):
    records = db.query(SessionAttendanceRecord).filter(SessionAttendanceRecord.session_id == id).all()
    result = []
    for r in records:
        result.append({
            "id": r.id,
            "session_id": r.session_id,
            "student_id": r.student_id,
            "student_name": r.student_name,
            "status": r.status,
            "verification_method": r.verification_method,
            "confidence": r.confidence,
            "timestamp": r.timestamp
        })
    return result

@router.post("/{sessionId}/clockin")
def clock_in_student(sessionId: str, clockin_data: dict, db: Session = Depends(get_db)):
    session = db.query(AcademicSession).filter(AcademicSession.id == sessionId).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    student_id = clockin_data.get("student_id")
    student_name = clockin_data.get("student_name")
    
    if not student_id or not student_name:
        raise HTTPException(status_code=400, detail="student_id and student_name required")
        
    record = db.query(SessionAttendanceRecord).filter(
        SessionAttendanceRecord.session_id == sessionId,
        SessionAttendanceRecord.student_id == student_id
    ).first()
    
    if record:
        record.status = "Present"
        record.verification_method = clockin_data.get("verification_method", "Manual")
        record.confidence = clockin_data.get("confidence", "--")
        record.timestamp = datetime.datetime.now().strftime("%I:%M %p")
    else:
        record = SessionAttendanceRecord(
            session_id=sessionId,
            student_id=student_id,
            student_name=student_name,
            status="Present",
            verification_method=clockin_data.get("verification_method", "Manual"),
            confidence=clockin_data.get("confidence", "--"),
            timestamp=datetime.datetime.now().strftime("%I:%M %p")
        )
        db.add(record)
        
    db.commit()
    db.refresh(record)
    
    return {
        "status": "ok",
        "message": "Student clocked in successfully",
        "record": {
            "id": record.id,
            "session_id": record.session_id,
            "student_id": record.student_id,
            "student_name": record.student_name,
            "status": record.status,
            "verification_method": record.verification_method,
            "confidence": record.confidence,
            "timestamp": record.timestamp
        }
    }

@router.get("/stats")
def get_session_stats(db: Session = Depends(get_db)):
    sessions = db.query(AcademicSession).all()
    trend = []
    
    for s in sessions:
        present = sum(1 for r in s.records if r.status == "Present")
        late = sum(1 for r in s.records if r.status == "Late")
        absent = sum(1 for r in s.records if r.status == "Absent")
        total = present + late + absent
        
        trend.append({
            "session": s.id,
            "session_name": s.course_name,
            "date": s.date,
            "present": present,
            "late": late,
            "absent": absent,
            "total": total
        })
        
    return {"trend": trend}
