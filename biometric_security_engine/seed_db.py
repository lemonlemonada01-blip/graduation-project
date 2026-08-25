"""
Secure-FEPRH Database Seeding and Migration Script
Safely applies column migrations to existing SQLite/Postgres tables and populates
relational records for users, teams, projects, deliverables, tasks, meetings, sessions, and audit logs.
"""

import os
import sys
import sqlite3
import datetime
from pathlib import Path

# Ensure paths are set
BIO_ROOT = Path(__file__).resolve().parent
AI_ENGINE_ROOT = BIO_ROOT.parent
if str(BIO_ROOT) not in sys.path:
    sys.path.insert(0, str(BIO_ROOT))
if str(AI_ENGINE_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_ENGINE_ROOT))

def migrate_existing_sqlite_schema():
    """Ensure missing columns like status and created_at exist in sqlite users table."""
    db_path = BIO_ROOT / "biometric_security.db"
    if not db_path.exists():
        return
    
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Check users table columns
        cursor.execute("PRAGMA table_info(users);")
        columns = [row[1] for row in cursor.fetchall()]
        
        if "status" not in columns and len(columns) > 0:
            print("[*] Migrating: Adding 'status' column to users table...")
            cursor.execute("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'Active';")
            
        if "created_at" not in columns and len(columns) > 0:
            print("[*] Migrating: Adding 'created_at' column to users table...")
            cursor.execute("ALTER TABLE users ADD COLUMN created_at TIMESTAMP;")
            cursor.execute("UPDATE users SET created_at = datetime('now') WHERE created_at IS NULL;")

        conn.commit()
        conn.close()
        print("[OK] SQLite schema migration checked.")
    except Exception as e:
        print(f"[!] Migration notice: {e}")

# Run migration before loading SQLAlchemy models
migrate_existing_sqlite_schema()

from api.main import (
    Base, rbac_engine, SessionLocal,
    User, ProjectComment, AcademicSession, SessionAttendanceRecord,
    Project, ProjectTask, ProjectDeliverable,
    Team, TeamMember, Meeting, MeetingAttendee, Notification, AuditLog
)

def seed_database():
    print("[*] Ensuring all tables exist on database engine...")
    Base.metadata.create_all(bind=rbac_engine)

    db = SessionLocal()
    today_str = datetime.date.today().isoformat()
    yesterday_str = (datetime.date.today() - datetime.timedelta(days=1)).isoformat()

    try:
        print("[*] Seeding Users...")
        users_to_seed = [
            ("Dr. Omar Al-Farsi", "o.alfarsi@gov.feprh.om", "Pass-Admin123!", "Ministry Admin", "Ministry of Higher Education", "Oversight & Accreditation", "Active"),
            ("Prof. Layla Hassan", "l.hassan@sqo.edu.om", "Pass-Admin123!", "University Admin", "Cairo University", "Computer Science", "Active"),
            ("Eng. Khalid Al-Mansoori", "k.almansoori@techno.edu.om", "Pass-Sup123!", "Supervisor", "Cairo University", "Cybersecurity", "Active"),
            ("Dr. Ahmed Hassan", "ahmed.hassan@uni.edu.eg", "Pass-Sup123!", "Supervisor", "Ain Shams University", "Artificial Intelligence", "Active"),
            ("Sarah Chen", "sarah.chen@student.uni.edu.eg", "Pass-Stud123!", "Student", "Cairo University", "Computer Science", "Active"),
            ("Omar Al-Farsi Jr", "omar.farsi@student.uni.edu.eg", "Pass-Stud123!", "Student", "Cairo University", "Computer Science", "Active"),
            ("Fatima Al-Zadjali", "fatima.zadjali@student.uni.edu.eg", "Pass-Stud123!", "Student", "Ain Shams University", "Cybersecurity", "Active"),
            ("Tariq Al-Busaidi", "tariq.busaidi@student.uni.edu.eg", "Pass-Stud123!", "Student", "Alexandria University", "Computer Engineering", "Active"),
            ("Zaid Al-Harbi", "zaid.harbi@student.uni.edu.eg", "Pass-Stud123!", "Student", "Cairo University", "Software Engineering", "Active"),
            ("Nour El-Din", "nour.eldin@student.uni.edu.eg", "Pass-Stud123!", "Student", "Ain Shams University", "Data Science", "Active"),
            ("Youssef Mansour", "youssef.mansour@student.uni.edu.eg", "Pass-Stud123!", "Student", "Cairo University", "Cybersecurity", "Active"),
            ("Reem Al-Husseini", "reem.husseini@student.uni.edu.eg", "Pass-Stud123!", "Student", "Ain Shams University", "Artificial Intelligence", "Active"),
        ]

        for name, email, pwd, role, uni, dept, st in users_to_seed:
            existing = db.query(User).filter(User.email == email).first()
            if not existing:
                u = User(
                    full_name=name,
                    email=email,
                    hashed_password=pwd,
                    role=role,
                    university=uni,
                    department=dept,
                    status=st
                )
                db.add(u)
        db.commit()

        print("[*] Seeding Teams & Members...")
        if db.query(Team).count() == 0:
            t1 = Team(
                name="Vision & Biometrics Core",
                description="Core AI research unit specializing in 3D passive anti-spoofing and micro-texture embeddings.",
                department="Computer Science",
                university="Cairo University",
                color_gradient="from-indigo-500 to-purple-600"
            )
            t2 = Team(
                name="Cyber-Audit AST Lab",
                description="Specialized in vulnerability AST scanning and source plagiarism detection.",
                department="Cybersecurity",
                university="Cairo University",
                color_gradient="from-emerald-500 to-teal-600"
            )
            t3 = Team(
                name="Autonomous Robotics Group",
                description="Developing indoor SLAM algorithms and navigation controllers.",
                department="Computer Engineering",
                university="Ain Shams University",
                color_gradient="from-cyan-500 to-blue-600"
            )
            t4 = Team(
                name="Federated Learning & Privacy",
                description="Decentralized privacy-preserving model aggregation with differential privacy guarantees.",
                department="Data Science",
                university="Cairo University",
                color_gradient="from-rose-500 to-amber-600"
            )
            db.add_all([t1, t2, t3, t4])
            db.commit()

            members_data = [
                (t1.id, "Dr. Ahmed Hassan", "ahmed.hassan@uni.edu.eg", "Leader", "+20 100 123 4567", "AH"),
                (t1.id, "Sarah Chen", "sarah.chen@student.uni.edu.eg", "System Architect", "+20 100 234 5678", "SC"),
                (t1.id, "Omar Al-Farsi Jr", "omar.farsi@student.uni.edu.eg", "AI Researcher", "+20 100 345 6789", "OF"),
                (t2.id, "Eng. Khalid Al-Mansoori", "khalid.mansoori@uni.edu.eg", "Leader", "+20 100 456 7890", "KM"),
                (t2.id, "Fatima Al-Zadjali", "fatima.zadjali@student.uni.edu.eg", "UI/UX Designer", "+20 100 567 8901", "FZ"),
                (t2.id, "Youssef Mansour", "youssef.mansour@student.uni.edu.eg", "AST Parser Engineer", "+20 100 890 1234", "YM"),
                (t3.id, "Prof. Layla Hassan", "layla.hassan@uni.edu.eg", "Leader", "+20 100 678 9012", "LH"),
                (t3.id, "Tariq Al-Busaidi", "tariq.busaidi@student.uni.edu.eg", "Embedded Dev", "+20 100 789 0123", "TB"),
                (t4.id, "Dr. Omar Al-Farsi", "o.alfarsi@gov.feprh.om", "Leader", "+20 100 901 2345", "OA"),
                (t4.id, "Reem Al-Husseini", "reem.husseini@student.uni.edu.eg", "Privacy Engineer", "+20 100 012 3456", "RH"),
            ]
            for tid, mname, memail, mrole, mphone, minit in members_data:
                db.add(TeamMember(
                    team_id=tid,
                    name=mname,
                    email=memail,
                    role_in_team=mrole,
                    phone=mphone,
                    initials=minit
                ))
            db.commit()

        print("[*] Seeding Projects, Tasks, and Deliverables...")
        if db.query(Project).count() == 0:
            p1 = Project(
                id="PRJ-001",
                title="AI-Powered Biometric Attendance System",
                abstract="Full-stack biometric attendance system utilizing 3D passive liveness detection and FaceNet embeddings for instant classroom verification.",
                domain="AI/ML",
                status="In Progress",
                supervisor_name="Dr. Ahmed Hassan",
                department="Computer Science Dept.",
                university="Cairo University",
                academic_year="2024/2025",
                progress_percentage=78.5
            )
            p2 = Project(
                id="PRJ-002",
                title="Cybersecurity AST Vulnerability Scanner",
                abstract="Deep semantic source code auditor using abstract syntax tree traversals and graph similarity algorithms to prevent academic plagiarism and security leaks.",
                domain="Cybersecurity",
                status="Approved",
                supervisor_name="Eng. Khalid Al-Mansoori",
                department="Cybersecurity Dept.",
                university="Cairo University",
                academic_year="2024/2025",
                progress_percentage=45.0
            )
            p3 = Project(
                id="PRJ-003",
                title="Autonomous Drone Navigation & SLAM",
                abstract="Real-time multi-sensor visual SLAM pipeline deployed on edge companion computers for indoor autonomous inspection.",
                domain="Robotics",
                status="Proposed",
                supervisor_name="Prof. Layla Hassan",
                department="Computer Engineering",
                university="Ain Shams University",
                academic_year="2024/2025",
                progress_percentage=20.0
            )
            p4 = Project(
                id="PRJ-004",
                title="Privacy-Preserving Federated Healthcare Analytics",
                abstract="Decentralized medical data aggregation protocol using homomorphic encryption and differential privacy to train diagnostic AI without exposing raw patient data.",
                domain="Data Science",
                status="Completed",
                supervisor_name="Dr. Omar Al-Farsi",
                department="Data Science Dept.",
                university="Cairo University",
                academic_year="2023/2024",
                progress_percentage=100.0
            )
            db.add_all([p1, p2, p3, p4])
            db.commit()

            t_data = [
                (p1.id, "Implement 3D Depth Map Estimation", "Integrate depth map heuristic for spoof mitigation", "Done", "High", "AI Model"),
                (p1.id, "Optimize ONNX Liveness Runtime", "Benchmark MiniFASNet inference latency on CPU", "Done", "Critical", "Optimization"),
                (p1.id, "Integrate SQLite / Postgres DB Synchronization", "Ensure dual engine support with schema migrations", "In Progress", "High", "Backend"),
                (p1.id, "Final Committee Capstone Defense Presentation", "Prepare executive slides and live demo", "To Do", "Medium", "Documentation"),
            ]
            for pid, ptitle, pdesc, pstatus, ppriority, pcat in t_data:
                db.add(ProjectTask(
                    project_id=pid,
                    title=ptitle,
                    description=pdesc,
                    status=pstatus,
                    priority=ppriority,
                    category=pcat
                ))

            db.add(ProjectDeliverable(
                project_id=p1.id,
                name="System_Architecture_V2.pdf",
                file_size="2.4 MB",
                file_type="pdf",
                uploader_name="Sarah Chen"
            ))
            db.add(ProjectDeliverable(
                project_id=p1.id,
                name="Biometric_Benchmark_Results.xlsx",
                file_size="850 KB",
                file_type="xlsx",
                uploader_name="Dr. Ahmed Hassan"
            ))
            db.commit()

        print("[*] Seeding Academic Sessions & Attendance Records...")
        if db.query(AcademicSession).count() == 0:
            s1 = AcademicSession(
                id="S-101",
                course_code="CS401",
                course_name="Senior Capstone Defense",
                session_type="Defense",
                room="Auditorium 3B",
                date=today_str,
                time_range="10:00 AM - 11:30 AM",
                grace_period=15,
                enrolled=24,
                status="Live Now"
            )
            s2 = AcademicSession(
                id="S-102",
                course_code="AI302",
                course_name="Deep Neural Architectures",
                session_type="Lecture",
                room="Lab 102",
                date=today_str,
                time_range="02:00 PM - 03:30 PM",
                grace_period=10,
                enrolled=32,
                status="Upcoming"
            )
            s3 = AcademicSession(
                id="S-103",
                course_code="CYBER505",
                course_name="Advanced Network Security & Threat Modeling",
                session_type="Lab",
                room="Security Ops Lab 4",
                date=yesterday_str,
                time_range="09:00 AM - 11:00 AM",
                grace_period=15,
                enrolled=18,
                status="Completed"
            )
            db.add_all([s1, s2, s3])
            db.commit()

            students_pool = [
                ("2024-CS-001", "Sarah Chen", "Present", "3D Biometric", "99.4%", f"{today_str} 10:02:14"),
                ("2024-CS-002", "Omar Al-Farsi Jr", "Present", "3D Biometric", "99.1%", f"{today_str} 10:03:45"),
                ("2024-CS-003", "Fatima Al-Zadjali", "Present", "Fast Face ID", "98.5%", f"{today_str} 10:05:12"),
                ("2024-CS-004", "Tariq Al-Busaidi", "Late", "Fast Face ID", "97.2%", f"{today_str} 10:14:02"),
                ("2024-CS-005", "Zaid Al-Harbi", "Absent", "Manual", "--", "--"),
                ("2024-CS-006", "Nour El-Din", "Present", "3D Biometric", "99.7%", f"{today_str} 10:01:50"),
                ("2024-CS-007", "Youssef Mansour", "Present", "3D Biometric", "99.3%", f"{today_str} 10:04:19"),
                ("2024-CS-008", "Reem Al-Husseini", "Present", "3D Biometric", "98.9%", f"{today_str} 10:03:01"),
            ]

            for sid, sname, st, meth, conf, ts in students_pool:
                db.add(SessionAttendanceRecord(
                    session_id=s1.id,
                    student_id=sid,
                    student_name=sname,
                    status=st,
                    verification_method=meth,
                    confidence=conf,
                    timestamp=ts
                ))
            db.commit()

        print("[*] Seeding Meetings & Attendees...")
        if db.query(Meeting).count() == 0:
            m1 = Meeting(
                title="Mid-Term Milestone Evaluation",
                project_id="PRJ-001",
                session_id="S-101",
                date=today_str,
                time_range="10:00 AM - 11:30 AM",
                room="Auditorium 3B",
                notes="Reviewing passive liveness benchmarks, FAR/FRR metrics, and AST plagiarism scan pipelines.",
                status="verified"
            )
            m2 = Meeting(
                title="Sprint Planning & Architecture Review",
                project_id="PRJ-002",
                session_id="S-102",
                date=today_str,
                time_range="02:00 PM - 03:30 PM",
                room="Lab 102",
                notes="Reviewing multi-language AST tree parser and code similarity metrics.",
                status="partial"
            )
            m3 = Meeting(
                title="Proposal Defense & Scope Review",
                project_id="PRJ-003",
                session_id="S-103",
                date=today_str,
                time_range="11:00 AM - 12:30 PM",
                room="Virtual / Zoom",
                notes="Initial project scope and milestones sign-off with supervisory committee.",
                status="unverified"
            )
            db.add_all([m1, m2, m3])
            db.commit()

            m_attendees = [
                (m1.id, "Sarah Chen", "2024-CS-001", 1, "3D Biometric", "99.4%", f"{today_str} 10:02 AM"),
                (m1.id, "Omar Al-Farsi Jr", "2024-CS-002", 1, "3D Biometric", "99.1%", f"{today_str} 10:04 AM"),
                (m1.id, "Fatima Al-Zadjali", "2024-CS-003", 1, "Fast Face ID", "98.5%", f"{today_str} 10:05 AM"),
                (m2.id, "Eng. Khalid Al-Mansoori", "FAC-002", 1, "3D Biometric", "99.8%", f"{today_str} 02:01 PM"),
                (m2.id, "Sarah Chen", "2024-CS-001", 0, "--", "--", "--"),
                (m3.id, "Tariq Al-Busaidi", "2024-CS-004", 0, "--", "--", "--"),
            ]
            for mid, sname, sid, is_v, meth, conf, ts in m_attendees:
                db.add(MeetingAttendee(
                    meeting_id=mid,
                    student_name=sname,
                    student_id=sid,
                    is_verified=is_v,
                    verification_method=meth,
                    confidence=conf,
                    timestamp=ts
                ))
            db.commit()

        print("[*] Seeding Notifications & Audit Logs...")
        if db.query(Notification).count() == 0:
            n1 = Notification(
                title="Plagiarism Alert: High Similarity Flagged (41%)",
                description="Project 'Autonomous Drone Navigation' flagged 41% AST token overlap with external repository.",
                notif_type="alert",
                link_route="/plagiarism"
            )
            n2 = Notification(
                title="Biometric Attendance Verified",
                description="Session CS401 Senior Project Defense achieved 100% verified attendance.",
                notif_type="success",
                link_route="/attendance"
            )
            n3 = Notification(
                title="Milestone Submission Review",
                description="Milestone 3 for 'Federated Learning Privacy Platform' submitted for supervisor review.",
                notif_type="info",
                link_route="/projects"
            )
            db.add_all([n1, n2, n3])

            al1 = AuditLog(
                actor_name="System Watcher",
                action_type="PLAGIARISM_SCAN",
                target_resource="PRJ-002",
                details="Automated AST fingerprint scan completed. Similarity score: 14% (Clean)",
                status="PASS"
            )
            al2 = AuditLog(
                actor_name="Biometric Guard",
                action_type="ACTIVE_LIVENESS",
                target_resource="Session S-101",
                details="3D Passive Anti-Spoofing challenge passed with 99.4% confidence (Zero-Spoof).",
                status="PASS"
            )
            db.add_all([al1, al2])
            db.commit()

        print("[OK] Database seeding completed successfully! All relational records are synchronized.")
    except Exception as e:
        db.rollback()
        print(f"[!] Error seeding database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
