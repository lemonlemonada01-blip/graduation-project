#!/bin/bash
sed -i 's/import { Skeleton } from "..\/components\/ui\/Skeleton";/import { Skeleton } from "..\/components\/ui\/Skeleton";\nimport { useTranslation } from "react-i18next";/' src/pages/Meetings.tsx
sed -i 's/export function Meetings() {/export function Meetings() {\n  const { t } = useTranslation();/' src/pages/Meetings.tsx
sed -i 's/Meeting Management/{t("meeting_management")}/' src/pages/Meetings.tsx
sed -i 's/Create Meeting (Cmd+N)/{t("create_meeting")} (Cmd+N)/' src/pages/Meetings.tsx
sed -i 's/>Meetings</>{t("meetings")}</' src/pages/Meetings.tsx
sed -i 's/flex items-center gap-1">Date/flex items-center gap-1">{t("date")}/' src/pages/Meetings.tsx
sed -i 's/font-medium">Project/font-medium">{t("project")}/' src/pages/Meetings.tsx
sed -i 's/font-medium">Notes/font-medium">{t("notes")}/' src/pages/Meetings.tsx
sed -i 's/font-medium">Attendance/font-medium">{t("attendance")}/' src/pages/Meetings.tsx
sed -i 's/text-right">Actions/text-right">{t("actions")}/' src/pages/Meetings.tsx
sed -i 's/>Student Name</>{t("student_name")}</' src/pages/Meetings.tsx
sed -i 's/>Verification</>{t("verification")}</' src/pages/Meetings.tsx
sed -i 's/>Timestamp</>{t("timestamp")}</' src/pages/Meetings.tsx
sed -i 's/Face Verified/{t("face_verified")}/' src/pages/Meetings.tsx
sed -i 's/Not Verified/{t("not_verified")}/' src/pages/Meetings.tsx
