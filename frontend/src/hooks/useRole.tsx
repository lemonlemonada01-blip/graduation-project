import { useMemo, type ReactNode } from "react";

export type AppRole = "Admin" | "Instructor" | "Student" | "Staff" | string;

const ROLE_GROUPS: Record<string, Set<string>> = {
  admin: new Set(["admin", "ministry admin", "university admin"]),
  instructor: new Set(["instructor", "supervisor", "faculty member"]),
  student: new Set(["student"]),
  staff: new Set(["staff", "administrative staff", "security personnel"]),
};

function readUser(): { role?: string; name?: string; full_name?: string; email?: string } | null {
  try {
    const raw = localStorage.getItem("user_data");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function roleMatches(role: string | undefined, allowedRoles: string[]): boolean {
  const normalized = String(role || "").trim().toLowerCase();
  if (!normalized) return false;
  return allowedRoles.some((allowed) => {
    const allowedNormalized = allowed.trim().toLowerCase();
    const group = ROLE_GROUPS[allowedNormalized];
    return group ? group.has(normalized) : normalized === allowedNormalized;
  });
}

export function useRole() {
  const user = useMemo(readUser, []);
  const role = user?.role || "Student";

  return {
    user,
    role,
    isAdmin: roleMatches(role, ["Admin"]),
    isInstructor: roleMatches(role, ["Instructor"]),
    isStudent: roleMatches(role, ["Student"]),
    can: (...allowedRoles: string[]) => roleMatches(role, allowedRoles),
  };
}

export function RoleGate({
  allowed,
  children,
  fallback = null,
}: {
  allowed: string[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { role } = useRole();
  return roleMatches(role, allowed) ? <>{children}</> : <>{fallback}</>;
}
