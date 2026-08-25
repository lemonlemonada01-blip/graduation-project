#!/bin/bash
sed -i 's/import { Avatar } from "..\/components\/ui\/Avatar";/import { Avatar } from "..\/components\/ui\/Avatar";\nimport { useTranslation } from "react-i18next";/' src/pages/Teams.tsx
sed -i 's/export function Teams() {/export function Teams() {\n  const { t } = useTranslation();/' src/pages/Teams.tsx
sed -i 's/Team Directory/{t("team_directory")}/' src/pages/Teams.tsx
sed -i 's/Manage and view all faculty and project members/{t("team_directory_desc")}/' src/pages/Teams.tsx
sed -i 's/placeholder="Search members..."/placeholder={t("search_members")}/' src/pages/Teams.tsx
sed -i 's/Edit Profile/{t("edit_profile")}/' src/pages/Teams.tsx
sed -i 's/Suspend User/{t("suspend_user")}/' src/pages/Teams.tsx
sed -i 's/Remove/{t("remove")}/' src/pages/Teams.tsx
