#!/bin/bash
sed -i '/"email": "Email"/a \
    ,"team_directory": "Team Directory",\
    "team_directory_desc": "Manage and view all faculty and project members",\
    "search_members": "Search members...",\
    "suspend_user": "Suspend User",\
    "remove": "Remove",\
    "meeting_management": "Meeting Management",\
    "create_meeting": "Create Meeting",\
    "date": "Date",\
    "project": "Project",\
    "notes": "Notes",\
    "attendance": "Attendance",\
    "expand": "Expand",\
    "collapse": "Collapse",\
    "student_name": "Student Name",\
    "verification": "Verification",\
    "face_verified": "Face Verified",\
    "not_verified": "Not Verified",\
    "reports_analytics": "Reports & Analytics",\
    "reports_desc": "Detailed metrics on projects, attendance, and team performance",\
    "last_updated": "Last updated:",\
    "pending_reviews": "Pending Reviews",\
    "avg_attendance": "Avg. Attendance",\
    "api_services": "API Services",\
    "database_sync": "Database Sync: Live",\
    "ai_model_degraded": "1 AI Model Degraded",\
    "project_completion_rate": "Project Completion Rate Over Time",\
    "project_completion_desc": "Monthly completed projects vs target goals",\
    "attendance_trends": "Attendance Trends Over Time",\
    "attendance_trends_desc": "Weekly participation rate comparison (Students vs Supervisors)",\
    "project_status": "Project Status",\
    "team_activity_trends": "Team Activity Trends",\
    "meeting_attendance": "Meeting Attendance",\
    "recent_resource_allocations": "Recent Resource Allocations",\
    "id": "ID",\
    "risk": "Risk"' src/lib/i18n.tsx

sed -i '/"email": "البريد الإلكتروني"/a \
    ,"team_directory": "دليل الفريق",\
    "team_directory_desc": "إدارة وعرض جميع أعضاء هيئة التدريس والمشاريع",\
    "search_members": "البحث عن أعضاء...",\
    "suspend_user": "إيقاف المستخدم",\
    "remove": "إزالة",\
    "meeting_management": "إدارة الاجتماعات",\
    "create_meeting": "إنشاء اجتماع",\
    "date": "التاريخ",\
    "project": "المشروع",\
    "notes": "ملاحظات",\
    "attendance": "الحضور",\
    "expand": "توسيع",\
    "collapse": "طي",\
    "student_name": "اسم الطالب",\
    "verification": "التحقق",\
    "face_verified": "تم التحقق من الوجه",\
    "not_verified": "لم يتم التحقق",\
    "reports_analytics": "التقارير والتحليلات",\
    "reports_desc": "مقاييس مفصلة حول المشاريع والحضور وأداء الفريق",\
    "last_updated": "آخر تحديث:",\
    "pending_reviews": "المراجعات المعلقة",\
    "avg_attendance": "متوسط الحضور",\
    "api_services": "خدمات API",\
    "database_sync": "مزامنة قاعدة البيانات: مباشر",\
    "ai_model_degraded": "نموذج AI واحد معطل",\
    "project_completion_rate": "معدل إنجاز المشاريع بمرور الوقت",\
    "project_completion_desc": "المشاريع المنجزة شهريًا مقابل الأهداف",\
    "attendance_trends": "اتجاهات الحضور بمرور الوقت",\
    "attendance_trends_desc": "مقارنة معدل المشاركة الأسبوعية (الطلاب مقابل المشرفين)",\
    "project_status": "حالة المشروع",\
    "team_activity_trends": "اتجاهات نشاط الفريق",\
    "meeting_attendance": "حضور الاجتماعات",\
    "recent_resource_allocations": "تخصيصات الموارد الأخيرة",\
    "id": "المعرف",\
    "risk": "المخاطر"' src/lib/i18n.tsx
