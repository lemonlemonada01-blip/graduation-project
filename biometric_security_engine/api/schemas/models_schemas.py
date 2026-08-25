from pydantic import BaseModel
from typing import Optional, List

class TeamMemberCreate(BaseModel):
    user_id: Optional[int] = None
    name: str
    email: Optional[str] = None
    role_in_team: str = "Member"
    phone: Optional[str] = None
    initials: Optional[str] = None

class TeamCreate(BaseModel):
    name: str
    description: Optional[str] = None
    department: str = "Computer Science"
    university: str = "Cairo University"
    color_gradient: str = "from-indigo-500 to-purple-600"
    leader_id: Optional[int] = None
    members: Optional[List[TeamMemberCreate]] = None

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    department: Optional[str] = None
    university: Optional[str] = None
    color_gradient: Optional[str] = None
    leader_id: Optional[int] = None

class ProjectCreate(BaseModel):
    id: Optional[str] = None
    title: str
    abstract: Optional[str] = None
    domain: str = "AI/ML"
    status: str = "Proposed"
    supervisor_id: Optional[int] = None
    supervisor_name: str = "Dr. Ahmed Hassan"
    team_id: Optional[int] = None
    department: str = "Computer Science Dept."
    university: str = "Cairo University"
    academic_year: str = "2024/2025"
    progress_percentage: float = 0.0

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    abstract: Optional[str] = None
    domain: Optional[str] = None
    status: Optional[str] = None
    supervisor_id: Optional[int] = None
    supervisor_name: Optional[str] = None
    team_id: Optional[int] = None
    department: Optional[str] = None
    university: Optional[str] = None
    academic_year: Optional[str] = None
    progress_percentage: Optional[float] = None

class ProjectStatusUpdate(BaseModel):
    status: str

class ProjectTaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "To Do"
    priority: str = "Medium"
    category: str = "General"
    assignee_id: Optional[int] = None
    assignee_name: Optional[str] = None

class ProjectTaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    assignee_id: Optional[int] = None
    assignee_name: Optional[str] = None
    order_index: Optional[int] = None

class MeetingAttendeeItem(BaseModel):
    student_name: str
    student_id: Optional[str] = None
    is_verified: int = 0
    verification_method: str = "3D Biometric"
    confidence: str = "99.4%"
    timestamp: str = "--"

class MeetingCreate(BaseModel):
    title: str
    project_id: Optional[str] = None
    session_id: Optional[str] = None
    date: str
    time_range: str = "10:00 AM - 11:30 AM"
    room: str = "Auditorium 3B"
    notes: Optional[str] = None
    status: str = "unverified"
    attendees: Optional[List[MeetingAttendeeItem]] = None

class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    project_id: Optional[str] = None
    session_id: Optional[str] = None
    date: Optional[str] = None
    time_range: Optional[str] = None
    room: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None

class MeetingVerifyPayload(BaseModel):
    student_id: Optional[str] = None
    student_name: str
    verification_method: str = "3D Biometric"
    confidence: Optional[str] = "99.4%"

class CommentCreate(BaseModel):
    content: str
    user_id: int

class NotificationCreate(BaseModel):
    user_id: Optional[int] = None
    title: str
    description: str
    notif_type: str = "info"
    link_route: Optional[str] = None

class PlagiarismScanRequest(BaseModel):
    scan_type: str = "project"
    target: Optional[str] = "AI-Powered Attendance System"
    project_paths: Optional[List[str]] = None

class ProjectUploadFileItem(BaseModel):
    path: str
    content: str
    file_type: Optional[str] = None

class ProjectUploadScanPayload(BaseModel):
    project_name: str = "Uploaded Project"
    files: List[ProjectUploadFileItem]
    scan_type: str = "project"

class GitRepoScanPayload(BaseModel):
    repo_url: str
    branch: Optional[str] = "main"
    access_token: Optional[str] = None
    project_name: Optional[str] = None
    scan_type: Optional[str] = "Git Repository AI Integrity Scan"

class TextCompareRequest(BaseModel):
    text1: str
    text2: str
    title1: Optional[str] = ""
    title2: Optional[str] = ""

class CodeCompareRequest(BaseModel):
    code1: str
    code2: str
    filename1: Optional[str] = None
    filename2: Optional[str] = None
