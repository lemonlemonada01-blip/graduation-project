#!/bin/bash

# Modify src/lib/i18n.tsx
cat << 'I18N' > src/lib/i18n.tsx
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const translations = {
  en: {
    "dashboard": "Dashboard",
    "projects": "Projects",
    "teams": "Teams",
    "meetings": "Meetings",
    "plagiarism": "Plagiarism Scanner",
    "attendance": "Attendance",
    "user_management": "User Management",
    "reports": "Reports",
    "settings": "Settings",
    "edit_profile": "Edit Profile",
    "change_password": "Change Password",
    "current_password": "Current Password",
    "new_password": "New Password",
    "confirm_password": "Confirm Password",
    "update_password": "Update Password",
    "preferences": "Preferences",
    "theme": "Theme",
    "dark": "Dark",
    "light": "Light",
    "system": "System",
    "language": "Language",
    "english": "English",
    "arabic": "Arabic",
    "notifications": "Notifications",
    "email_alerts": "Email Alerts",
    "desktop_alerts": "Desktop Alerts",
    "activity_log": "System Activity Log",
    "action": "Action",
    "user": "User",
    "time": "Time",
    "ip": "IP Address",
    "showing_logs": "Showing latest 4 system events",
    "view_all_logs": "View All Logs",
    "face_attendance": "Face Attendance",
    "select_meeting": "Select Meeting",
    "meeting_1": "Supervisor Meeting — Jul 18, 2025",
    "meeting_2": "Project Review — Jul 20, 2025",
    "turn_left": "Please turn your head slowly to the LEFT",
    "look_up": "Please look UP slightly",
    "turn_right": "Please turn your head slowly to the RIGHT",
    "center": "Look straight at the camera",
    "verifying_face": "Extracting 3D facial vectors...",
    "match_found": "Match found!",
    "position_face": "Position your face within the frame",
    "analyzing_mesh": "Analyzing 3D Mesh...",
    "start_liveness_check": "Start Liveness Check",
    "identity_verified": "Identity Verified Successfully",
    "clocked_in": "You are now clocked in for this meeting.",
    "timestamp": "Timestamp",
    "overview": "Overview",
    "scan_type": "Scan Type",
    "run_scan": "Run National Plagiarism Scan",
    "export_report": "Export Report",
    "status": "Status",
    "domain": "Domain",
    "proposed": "Proposed",
    "approved": "Approved",
    "in_progress": "In Progress",
    "completed": "Completed",
    "add_project": "Add Project",
    "search_projects": "Search projects...",
    "search_users": "Search users...",
    "global_command_center": "Global Command Center",
    "active_projects": "Active Projects",
    "active_users": "Active Users",
    "recent_meetings": "Recent Meetings",
    "system_health": "System Health",
    "quick_actions": "Quick Actions",
    "new_project": "New Project",
    "schedule_meeting": "Schedule Meeting",
    "generate_report": "Generate Report",
    "recent_activity": "Recent Activity",
    "users_table": "Users Table",
    "role": "Role",
    "department": "Department",
    "university": "University",
    "actions": "Actions",
    "add_user": "Add User",
    "provision_new_account": "Provision New Account",
    "name": "Name",
    "email": "Email"
  },
  ar: {
    "dashboard": "لوحة القيادة",
    "projects": "المشاريع",
    "teams": "الفرق",
    "meetings": "الاجتماعات",
    "plagiarism": "ماسح الانتحال",
    "attendance": "الحضور",
    "user_management": "إدارة المستخدمين",
    "reports": "التقارير",
    "settings": "الإعدادات",
    "edit_profile": "تعديل الملف الشخصي",
    "change_password": "تغيير كلمة المرور",
    "current_password": "كلمة المرور الحالية",
    "new_password": "كلمة المرور الجديدة",
    "confirm_password": "تأكيد كلمة المرور",
    "update_password": "تحديث كلمة المرور",
    "preferences": "التفضيلات",
    "theme": "المظهر",
    "dark": "داكن",
    "light": "فاتح",
    "system": "النظام",
    "language": "اللغة",
    "english": "الإنجليزية",
    "arabic": "العربية",
    "notifications": "الإشعارات",
    "email_alerts": "تنبيهات البريد الإلكتروني",
    "desktop_alerts": "تنبيهات سطح المكتب",
    "activity_log": "سجل نشاط النظام",
    "action": "الإجراء",
    "user": "المستخدم",
    "time": "الوقت",
    "ip": "عنوان IP",
    "showing_logs": "عرض آخر 4 أحداث للنظام",
    "view_all_logs": "عرض كافة السجلات",
    "face_attendance": "تسجيل الحضور بالوجه",
    "select_meeting": "اختر الاجتماع",
    "meeting_1": "اجتماع المشرف - 18 يوليو 2025",
    "meeting_2": "مراجعة المشروع - 20 يوليو 2025",
    "turn_left": "يرجى إدارة رأسك ببطء إلى اليسار",
    "look_up": "يرجى النظر إلى الأعلى قليلاً",
    "turn_right": "يرجى إدارة رأسك ببطء إلى اليمين",
    "center": "انظر مباشرة إلى الكاميرا",
    "verifying_face": "جاري استخراج ميزات الوجه ثلاثية الأبعاد...",
    "match_found": "تم العثور على تطابق!",
    "position_face": "ضع وجهك داخل الإطار",
    "analyzing_mesh": "جاري تحليل الشبكة ثلاثية الأبعاد...",
    "start_liveness_check": "بدء فحص الحيوية",
    "identity_verified": "تم التحقق من الهوية بنجاح",
    "clocked_in": "لقد قمت بتسجيل الحضور لهذا الاجتماع.",
    "timestamp": "الطابع الزمني",
    "overview": "نظرة عامة",
    "scan_type": "نوع المسح",
    "run_scan": "تشغيل فحص الانتحال الوطني",
    "export_report": "تصدير التقرير",
    "status": "الحالة",
    "domain": "المجال",
    "proposed": "مقترح",
    "approved": "تمت الموافقة",
    "in_progress": "قيد التنفيذ",
    "completed": "مكتمل",
    "add_project": "إضافة مشروع",
    "search_projects": "البحث في المشاريع...",
    "search_users": "البحث عن مستخدمين...",
    "global_command_center": "مركز القيادة العالمي",
    "active_projects": "المشاريع النشطة",
    "active_users": "المستخدمين النشطين",
    "recent_meetings": "الاجتماعات الأخيرة",
    "system_health": "صحة النظام",
    "quick_actions": "إجراءات سريعة",
    "new_project": "مشروع جديد",
    "schedule_meeting": "جدولة اجتماع",
    "generate_report": "إنشاء تقرير",
    "recent_activity": "النشاط الأخير",
    "users_table": "جدول المستخدمين",
    "role": "الدور",
    "department": "القسم",
    "university": "الجامعة",
    "actions": "إجراءات",
    "add_user": "إضافة مستخدم",
    "provision_new_account": "توفير حساب جديد",
    "name": "الاسم",
    "email": "البريد الإلكتروني"
  }
};

const savedLanguage = localStorage.getItem('language') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: translations.en },
      ar: { translation: translations.ar }
    },
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false 
    }
  });

i18n.on('languageChanged', (lng) => {
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
  localStorage.setItem('language', lng);
});

// Run once on load
document.documentElement.dir = savedLanguage === 'ar' ? 'rtl' : 'ltr';
document.documentElement.lang = savedLanguage;

export default i18n;
I18N

# 1. Update Topbar.tsx
sed -i 's/import { useI18n } from "..\/..\/lib\/i18n";/import { useTranslation } from "react-i18next";/' src/components/layout/Topbar.tsx
sed -i 's/const { language, setLanguage } = useI18n();/const { i18n } = useTranslation();\n  const language = i18n.language;\n  const setLanguage = (lang: string) => i18n.changeLanguage(lang);/' src/components/layout/Topbar.tsx

# 2. Update Sidebar.tsx
sed -i 's/import { useI18n } from "..\/..\/lib\/i18n";/import { useTranslation } from "react-i18next";/' src/components/layout/Sidebar.tsx
sed -i 's/const { t } = useI18n();/const { t } = useTranslation();/' src/components/layout/Sidebar.tsx

# 3. Update Settings.tsx
sed -i 's/import { useI18n } from "..\/lib\/i18n";/import { useTranslation } from "react-i18next";/' src/pages/Settings.tsx
sed -i 's/const { language, setLanguage, t } = useI18n();/const { t, i18n } = useTranslation();\n  const language = i18n.language;\n  const setLanguage = (lang: string) => i18n.changeLanguage(lang);/' src/pages/Settings.tsx

# 4. Update other pages
for file in src/pages/Plagiarism.tsx src/pages/Attendance.tsx src/pages/Projects.tsx src/pages/CommandCenter.tsx src/pages/UserManagement.tsx; do
  sed -i 's/import { useI18n } from "..\/lib\/i18n";/import { useTranslation } from "react-i18next";/' "$file"
  sed -i 's/const { t } = useI18n();/const { t } = useTranslation();/' "$file"
done

# 5. Update main.tsx
sed -i 's/import { I18nProvider } from ".\/lib\/i18n.tsx";/import ".\/lib\/i18n.tsx";/' src/main.tsx
sed -i '/<I18nProvider>/d' src/main.tsx
sed -i '/<\/I18nProvider>/d' src/main.tsx

