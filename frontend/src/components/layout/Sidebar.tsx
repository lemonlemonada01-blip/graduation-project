import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  FolderKanban, 
  Users, 
  Calendar, 
  Settings, 
  LogOut,
  ShieldCheck,
  FileText,
  Search,
  Video
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useTranslation } from "react-i18next";
import { useRole } from "../../hooks/useRole";

const NAV_ITEMS = [
  { name: "dashboard", path: "/", icon: LayoutDashboard },
  { name: "projects", path: "/projects", icon: FolderKanban },
  { name: "teams", path: "/teams", icon: Users },
  { name: "sessions", path: "/sessions", icon: Calendar },
  { name: "plagiarism", path: "/plagiarism", icon: Search },
  { name: "attendance", path: "/attendance", icon: Video },
  { name: "user_management", path: "/users", icon: Users, roles: ["Admin"] },
  { name: "reports", path: "/reports", icon: FileText, roles: ["Admin", "Instructor"] },
];

export function Sidebar() {
  const { t } = useTranslation();
  const { can } = useRole();
  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || can(...item.roles));

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_data");
    localStorage.removeItem("user_email");
  };

  return (
    <aside className="w-64 flex-shrink-0 border-r border-glass-border bg-surface/30 hidden md:flex flex-col print:hidden">
      <div className="h-16 flex items-center px-6 border-b border-glass-border">
        <div className="flex items-center gap-3 text-text-main font-semibold text-lg tracking-wide">
          <ShieldCheck className="w-6 h-6 text-accent" />
          <span>Secure-FEPRH</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-1">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "nav-item",
                isActive && "active"
              )
            }
          >
            <item.icon className="w-5 h-5" />
            {t(item.name)}
          </NavLink>
        ))}
      </div>

      <div className="p-4 mt-auto">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              "nav-item",
              isActive && "active"
            )
          }
        >
          <Settings className="w-5 h-5" />
          {t('settings')}
        </NavLink>
        <NavLink
          to="/login"
          onClick={handleLogout}
          className="nav-item mt-1"
        >
          <LogOut className="w-5 h-5" />
          {t('logout')}
        </NavLink>
      </div>
    </aside>
  );
}
