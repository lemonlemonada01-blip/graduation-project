import enum
from sqlalchemy import Column, Integer, String, Float, DateTime as SADateTime, ForeignKey, Text
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func

Base = declarative_base()

class StudentBiometric(Base):
    __tablename__ = "student_biometrics"
    student_id = Column(String, primary_key=True, index=True)
    encrypted_embedding = Column(Text, nullable=False)
    registered_at = Column(SADateTime(timezone=True), server_default=func.now())

class UserRole(str, enum.Enum):
    MINISTRY_ADMIN = "Ministry Admin"
    UNIVERSITY_ADMIN = "University Admin"
    SUPERVISOR = "Supervisor"
    STUDENT = "Student"
    FACULTY = "Faculty Member"
    STAFF = "Administrative Staff"
    SECURITY = "Security Personnel"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False, default="Student")
    university = Column(String, nullable=True)
    department = Column(String, nullable=True)
    status = Column(String, default="Active")
    created_at = Column(SADateTime(timezone=True), server_default=func.now())
    comments = relationship("ProjectComment", back_populates="author")

class ProjectComment(Base):
    __tablename__ = "project_comments"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(SADateTime(timezone=True), server_default=func.now())
    author = relationship("User", back_populates="comments")

class AcademicSession(Base):
    __tablename__ = "academic_sessions"
    id = Column(String, primary_key=True, index=True)  # e.g. "S-101"
    course_code = Column(String, nullable=False)
    course_name = Column(String, nullable=False)
    session_type = Column(String, default="Lecture")  # Lecture, Lab, Defense Committee, Exam
    room = Column(String, nullable=False)
    date = Column(String, nullable=False)
    time_range = Column(String, nullable=False)
    grace_period = Column(Integer, default=15)
    enrolled = Column(Integer, default=0)
    status = Column(String, default="Upcoming")  # Upcoming, Live Now, Completed, Cancelled
    created_at = Column(SADateTime(timezone=True), server_default=func.now())
    records = relationship("SessionAttendanceRecord", back_populates="session", cascade="all, delete-orphan")

class SessionAttendanceRecord(Base):
    __tablename__ = "session_attendance_records"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(String, ForeignKey("academic_sessions.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(String, nullable=False)
    student_name = Column(String, nullable=False)
    status = Column(String, default="Absent")  # Present, Late, Absent
    verification_method = Column(String, default="Manual")  # 3D Biometric, Fast Face ID, Manual
    confidence = Column(String, default="--")
    timestamp = Column(String, default="--")
    session = relationship("AcademicSession", back_populates="records")

class PlagiarismScanReport(Base):
    __tablename__ = "plagiarism_scan_reports"
    id = Column(String, primary_key=True, index=True)
    project_name = Column(String, nullable=False)
    scan_type = Column(String, default="Comprehensive (AST + CodeBERT + NLP)")
    overall_similarity = Column(Float, nullable=False)
    code_similarity = Column(Float, nullable=False)
    text_similarity = Column(Float, nullable=False)
    verdict = Column(String, nullable=False)  # "SAFE" or "FLAGGED"
    total_files = Column(Integer, default=0)
    total_loc = Column(Integer, default=0)
    comparisons_json = Column(Text, nullable=True)
    logs_json = Column(Text, nullable=True)
    created_at = Column(SADateTime(timezone=True), server_default=func.now())

class Project(Base):
    __tablename__ = "projects"
    id = Column(String(50), primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    abstract = Column(Text, nullable=True)
    domain = Column(String(100), default="AI/ML")
    status = Column(String(50), default="Proposed", index=True)  # Proposed, Approved, In Progress, Completed, Archived
    supervisor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    supervisor_name = Column(String(150), default="Dr. Ahmed Hassan")
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="SET NULL"), nullable=True)
    department = Column(String(150), default="Computer Science Dept.")
    university = Column(String(150), default="Cairo University")
    academic_year = Column(String(50), default="2024/2025")
    progress_percentage = Column(Float, default=0.0)
    created_at = Column(SADateTime(timezone=True), server_default=func.now())
    updated_at = Column(SADateTime(timezone=True), onupdate=func.now())

    tasks = relationship("ProjectTask", back_populates="project", cascade="all, delete-orphan")
    deliverables = relationship("ProjectDeliverable", back_populates="project", cascade="all, delete-orphan")
    meetings = relationship("Meeting", back_populates="project", cascade="all, delete-orphan")

class Team(Base):
    __tablename__ = "teams"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(150), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    department = Column(String(150), default="Computer Science")
    university = Column(String(150), default="Cairo University")
    color_gradient = Column(String(100), default="from-indigo-500 to-purple-600")
    leader_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(SADateTime(timezone=True), server_default=func.now())

    members = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")

class TeamMember(Base):
    __tablename__ = "team_members"
    id = Column(Integer, primary_key=True, autoincrement=True)
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(150), nullable=True)
    email = Column(String(150), nullable=True)
    role_in_team = Column(String(50), default="Member")
    phone = Column(String(50), nullable=True)
    initials = Column(String(10), nullable=True)
    joined_at = Column(SADateTime(timezone=True), server_default=func.now())

    team = relationship("Team", back_populates="members")

class ProjectTask(Base):
    __tablename__ = "project_tasks"
    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(String(50), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="To Do")  # "To Do", "In Progress", "In Review", "Done"
    priority = Column(String(20), default="Medium")  # "Low", "Medium", "High", "Critical"
    category = Column(String(50), default="General")
    assignee_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assignee_name = Column(String(150), nullable=True)
    order_index = Column(Integer, default=0)
    created_at = Column(SADateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="tasks")

class ProjectDeliverable(Base):
    __tablename__ = "project_deliverables"
    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(String(50), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=True)
    file_size = Column(String(50), default="1.5 MB")
    file_type = Column(String(50), default="pdf")
    uploader_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    uploader_name = Column(String(150), nullable=True)
    uploaded_at = Column(SADateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="deliverables")

class Meeting(Base):
    __tablename__ = "meetings"
    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    project_id = Column(String(50), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    session_id = Column(String(50), ForeignKey("academic_sessions.id", ondelete="SET NULL"), nullable=True)
    date = Column(String(50), nullable=False)
    time_range = Column(String(100), default="10:00 AM - 11:30 AM")
    room = Column(String(100), default="Auditorium 3B")
    notes = Column(Text, nullable=True)
    status = Column(String(50), default="unverified")  # "verified", "partial", "unverified"
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(SADateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="meetings")
    attendees = relationship("MeetingAttendee", back_populates="meeting", cascade="all, delete-orphan")

class MeetingAttendee(Base):
    __tablename__ = "meeting_attendees"
    id = Column(Integer, primary_key=True, autoincrement=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    student_name = Column(String(150), nullable=False)
    student_id = Column(String(100), nullable=True)
    is_verified = Column(Integer, default=0)
    verification_method = Column(String(50), default="3D Biometric")
    confidence = Column(String(50), default="99.4%")
    timestamp = Column(String(100), default="--")

    meeting = relationship("Meeting", back_populates="attendees")

class UserPreference(Base):
    __tablename__ = "user_preferences"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    theme = Column(String(20), default="dark")
    language = Column(String(10), default="en")
    notif_plagiarism_alerts = Column(Integer, default=1)
    notif_meeting_reminders = Column(Integer, default=1)
    notif_project_updates = Column(Integer, default=1)
    updated_at = Column(SADateTime(timezone=True), onupdate=func.now())

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    notif_type = Column(String(50), default="info")  # "alert", "info", "success", "warning"
    is_read = Column(Integer, default=0)
    link_route = Column(String(255), nullable=True)
    created_at = Column(SADateTime(timezone=True), server_default=func.now(), index=True)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    user_name = Column(String(150), default="System")
    action = Column(String(255), nullable=False)
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), default="127.0.0.1")
    created_at = Column(SADateTime(timezone=True), server_default=func.now(), index=True)

class SystemSetting(Base):
    __tablename__ = "system_settings"
    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(255), unique=True, nullable=False)
    value = Column(Text, nullable=False)
    updated_at = Column(SADateTime(timezone=True), onupdate=func.now(), server_default=func.now())
