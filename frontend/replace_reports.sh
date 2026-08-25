#!/bin/bash
sed -i 's/import { Tooltip } from "..\/components\/ui\/Tooltip";/import { Tooltip } from "..\/components\/ui\/Tooltip";\nimport { useTranslation } from "react-i18next";/' src/pages/Reports.tsx
sed -i 's/export function Reports() {/export function Reports() {\n  const { t } = useTranslation();/' src/pages/Reports.tsx
sed -i 's/Reports & Analytics/{t("reports_analytics")}/' src/pages/Reports.tsx
sed -i 's/Detailed metrics on projects, attendance, and team performance/{t("reports_desc")}/' src/pages/Reports.tsx
sed -i 's/Last updated:/{t("last_updated")}/' src/pages/Reports.tsx
sed -i 's/Export Report/{t("export_report")}/' src/pages/Reports.tsx
sed -i 's/>Active Users</>{t("active_users")}</' src/pages/Reports.tsx
sed -i 's/>Pending Reviews</>{t("pending_reviews")}</' src/pages/Reports.tsx
sed -i 's/>Avg. Attendance</>{t("avg_attendance")}</' src/pages/Reports.tsx
sed -i 's/>API Services</>{t("api_services")}</' src/pages/Reports.tsx
sed -i 's/>Database Sync: Live</>{t("database_sync")}</' src/pages/Reports.tsx
sed -i 's/>1 AI Model Degraded</>{t("ai_model_degraded")}</' src/pages/Reports.tsx
sed -i 's/>Project Completion Rate Over Time</>{t("project_completion_rate")}</' src/pages/Reports.tsx
sed -i 's/>Monthly completed projects vs target goals</>{t("project_completion_desc")}</' src/pages/Reports.tsx
sed -i 's/>Attendance Trends Over Time</>{t("attendance_trends")}</' src/pages/Reports.tsx
sed -i 's/>Weekly participation rate comparison (Students vs Supervisors)</>{t("attendance_trends_desc")}</' src/pages/Reports.tsx
sed -i 's/>Project Status</>{t("project_status")}</' src/pages/Reports.tsx
sed -i 's/>Team Activity Trends</>{t("team_activity_trends")}</' src/pages/Reports.tsx
sed -i 's/>Meeting Attendance</>{t("meeting_attendance")}</' src/pages/Reports.tsx
sed -i 's/>Recent Resource Allocations</>{t("recent_resource_allocations")}</' src/pages/Reports.tsx
sed -i 's/>ID</>{t("id")}</' src/pages/Reports.tsx
sed -i 's/>Department</>{t("department")}</' src/pages/Reports.tsx
sed -i 's/>Status</>{t("status")}</' src/pages/Reports.tsx
sed -i 's/>Risk</>{t("risk")}</' src/pages/Reports.tsx
