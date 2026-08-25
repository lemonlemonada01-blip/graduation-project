from pydantic import BaseModel
from typing import Optional, List

class ClockInPayload(BaseModel):
    student_id: str
    student_name: Optional[str] = None
    verification_method: str = "3D Biometric"
    confidence: Optional[str] = "99.4%"

class AttendanceRecord(BaseModel):
    id: int
    student_id: str
    student_name: str
    status: str
    verification_method: str
    confidence: str
    timestamp: str

class AttendanceStatsTrend(BaseModel):
    session: str
    session_name: str
    date: str
    present: int
    late: int
    absent: int
    total: int

class AttendanceStats(BaseModel):
    trend: List[AttendanceStatsTrend]

class SessionCreate(BaseModel):
    id: Optional[str] = None
    course_code: str
    course_name: str
    session_type: str = "Lecture"
    room: str
    date: str
    time_range: str
    grace_period: int = 15
    enrolled: int = 0
    status: str = "Upcoming"
    student_ids: Optional[List[str]] = None

class SessionUpdate(BaseModel):
    course_code: Optional[str] = None
    course_name: Optional[str] = None
    session_type: Optional[str] = None
    room: Optional[str] = None
    date: Optional[str] = None
    time_range: Optional[str] = None
    grace_period: Optional[int] = None
    status: Optional[str] = None
