import { useState, useEffect } from "react";
import { useRef } from "react";
import { Bell, Search, Settings, Menu, X, LayoutDashboard, FolderKanban, Users, Calendar, ShieldCheck, FileText, Video, LogOut, WifiOff, ChevronRight, Sun, Moon, Globe } from "lucide-react";
import { useLocation, NavLink, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar } from "../ui/Avatar";
import { cn } from "../../lib/utils";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { useOnClickOutside } from "../../hooks/useOnClickOutside";
import { useTranslation } from "react-i18next";
import { useRole } from "../../hooks/useRole";

const NAV_ITEMS = [
  { name: "dashboard", path: "/", icon: LayoutDashboard },
  { name: "projects", path: "/projects", icon: FolderKanban },
  { name: "teams", path: "/teams", icon: Users },
  { name: "sessions", path: "/sessions", icon: Calendar },
  { name: "meetings", path: "/meetings", icon: Calendar },
  { name: "plagiarism", path: "/plagiarism", icon: Search },
  { name: "attendance", path: "/attendance", icon: Video },
  { name: "user_management", path: "/users", icon: Users, roles: ["Admin"] },
  { name: "reports", path: "/reports", icon: FileText, roles: ["Admin", "Instructor"] },
];

export function Topbar() {
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const isOnline = useNetworkStatus();
  const { t, i18n } = useTranslation();
  const { can, user, role } = useRole();
  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || can(...item.roles));
  const displayName = user?.name || user?.full_name || user?.email || "Authenticated User";
  const language = i18n.language;
  const setLanguage = (lang: string) => i18n.changeLanguage(lang);
  
  const notifRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(notifRef, () => setShowNotifications(false));

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(searchRef, () => setIsSearchFocused(false));

  const allSearchResults = [
    { title: "AI-Powered Attendance", type: "Project", route: "/projects" },
    { title: "Cybersecurity Audit", type: "Project", route: "/projects" },
    { title: "Dr. Ahmed Hassan", type: "Team Member", route: "/teams" },
    { title: "Supervisor Meeting", type: "Meeting", route: "/meetings" },
  ];

  const filteredSearch = allSearchResults.filter(res => res.title.toLowerCase().includes(searchQuery.toLowerCase()));

  // Theme state
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains('dark') ||
      (!document.documentElement.classList.contains('light') && 
       window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  const getPageTitle = () => {
    switch (location.pathname) {
      case "/": return t("global_command_center");
      case "/projects": return t("projects");
      case "/teams": return t("teams");
      case "/sessions": return t("session_mgmt_title");
      case "/meetings": return t("meeting_management");
      case "/plagiarism": return t("plagiarism");
      case "/attendance": return t("attendance");
      case "/users": return t("user_management");
      case "/settings": return t("settings");
      case "/reports": return t("reports_analytics");
      default: {
        if (location.pathname.startsWith('/projects/')) {
          return "Project Details";
        }
        return "Secure-FEPRH";
      }
    }
  };

  const generateBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(p => p);
    if (paths.length === 0) return null;

    return (
      <div className="hidden lg:flex items-center text-sm font-medium text-text-muted ml-4 bg-text-muted/10 px-3 py-1.5 rounded-full border border-glass-border">
        <Link to="/" className="hover:text-text-main transition-colors">{t("dashboard")}</Link>
        {paths.map((path, index) => {
          const routeTo = `/${paths.slice(0, index + 1).join('/')}`;
          const isLast = index === paths.length - 1;
          
          let label = path.charAt(0).toUpperCase() + path.slice(1);
          // Try to translate the path segment
          const translationKey = path.toLowerCase();
          const translatedLabel = t(translationKey);
          if (translatedLabel !== translationKey) {
             label = translatedLabel;
          }
          
          return (
            <div key={path} className="flex items-center">
              <ChevronRight className="w-4 h-4 mx-1 opacity-50" />
              {isLast ? (
                <span className="text-text-main">{label}</span>
              ) : (
                <Link to={routeTo} className="hover:text-text-main transition-colors">
                  {label}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <header className="h-16 flex-shrink-0 border-b border-glass-border bg-surface/80 backdrop-blur-md flex items-center justify-between px-4 md:px-8 z-20 print:hidden">
        <div className="flex items-center gap-4">
          <button 
            className="md:hidden p-2 text-text-muted hover:text-text-main"
            onClick={() => setShowMobileMenu(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold text-text-main tracking-tight hidden sm:block whitespace-nowrap truncate">
            {getPageTitle()}
          </h1>
          {generateBreadcrumbs()}
        </div>

        <div className="flex items-center gap-2 md:gap-5">
          {!isOnline && (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-red-400 text-xs font-semibold animate-pulse mr-2">
              <WifiOff className="w-3.5 h-3.5" />
              Offline
            </div>
          )}
        <div 
          className="relative hidden md:block group z-50"
          ref={searchRef}
        >
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 group-hover:text-text-main transition-colors" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            placeholder="Search projects, teams..." 
            className="input-field pl-9 h-9 w-64 rounded-full bg-text-muted/10 border border-transparent focus:border-glass-border focus:bg-surface transition-colors group-hover:bg-text-muted/20"
          />
          <AnimatePresence>
            {isSearchFocused && searchQuery && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full mt-2 left-0 w-full bg-surface border border-glass-border rounded-xl shadow-2xl overflow-hidden py-2"
              >
                {filteredSearch.length > 0 ? (
                  filteredSearch.map((res, i) => (
                    <Link 
                      key={i} 
                      to={res.route}
                      onClick={() => { setIsSearchFocused(false); setSearchQuery(""); }}
                      className="block px-4 py-2 hover:bg-text-muted/10 transition-colors"
                    >
                      <p className="text-sm font-medium text-text-main">{res.title}</p>
                      <p className="text-xs text-text-muted">{res.type}</p>
                    </Link>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-text-muted text-center">No results found</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={toggleTheme}
            className="text-text-muted hover:text-text-main transition-colors p-2 rounded-full hover:bg-text-muted/10"
            title="Toggle theme"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <div className="relative" ref={notifRef}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative text-text-muted hover:text-text-main transition-colors p-2 rounded-full hover:bg-text-muted/10"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-background"></span>
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 top-full mt-2 w-80 bg-surface/95 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl z-50 border border-glass-border"
                >
                  <div className="p-4 border-b border-glass-border flex items-center justify-between bg-text-muted/5">
                    <h3 className="font-semibold text-text-main text-sm">Notifications</h3>
                    <span 
                      onClick={() => setShowNotifications(false)}
                      className="text-xs text-accent cursor-pointer hover:underline font-medium"
                    >
                      Mark all as read
                    </span>
                  </div>
                    <div className="max-h-80 overflow-y-auto">
                      {[
                        { title: "Plagiarism Alert", desc: "High similarity detected in 'AI Attendance' project.", time: "5m ago", type: "alert" },
                        { title: "Meeting Reminder", desc: "Supervisory board meeting in 15 mins.", time: "15m ago", type: "info" },
                        { title: "New User Registered", desc: "Sarah Chen joined the platform.", time: "2h ago", type: "success" },
                        { title: "System Update", desc: "Server maintenance scheduled for 2:00 AM UTC.", time: "5h ago", type: "info" }
                      ].map((notif, i) => (
                        <div key={i} className="p-4 border-b border-glass-border last:border-0 hover:bg-text-muted/10 cursor-pointer transition-colors flex gap-3">
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 shadow-sm ${
                            notif.type === 'alert' ? 'bg-red-500 shadow-red-500/50' : 
                            notif.type === 'success' ? 'bg-emerald-500 shadow-emerald-500/50' : 
                            'bg-blue-500 shadow-blue-500/50'
                          }`} />
                          <div>
                            <h4 className="text-sm font-medium text-text-main">{notif.title}</h4>
                            <p className="text-xs text-text-muted mt-1 leading-relaxed">{notif.desc}</p>
                            <span className="text-[10px] text-text-muted mt-2 block font-medium">{notif.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  <div className="p-3 border-t border-glass-border text-center bg-text-muted/5">
                    <button 
                      onClick={() => setShowNotifications(false)}
                      className="text-xs text-text-main font-medium hover:text-accent transition-colors"
                    >
                      View all notifications
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button 
            className="text-text-muted hover:text-text-main transition-colors p-2 rounded-full hover:bg-text-muted/10"
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            title="Toggle Language"
          >
            <Globe className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 ps-3 border-s border-glass-border ms-1 cursor-pointer group">
            <div className="flex flex-col text-end hidden sm:flex">
              <span className="text-sm font-medium text-text-main leading-tight group-hover:text-accent transition-colors">{displayName}</span>
              <span className="text-xs text-text-muted leading-tight">{role}</span>
            </div>
            <Avatar name={displayName} className="w-8 h-8 text-xs border border-glass-border" colorClass="from-indigo-500 to-purple-600" />
          </div>
        </div>
      </div>
    </header>

    <AnimatePresence>
      {showMobileMenu && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowMobileMenu(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
          />
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            className="fixed inset-y-0 left-0 w-64 bg-surface border-r border-glass-border z-50 flex flex-col md:hidden"
          >
            <div className="h-16 flex items-center justify-between px-6 border-b border-glass-border">
              <div className="flex items-center gap-3 text-text-main font-semibold text-lg tracking-wide">
                <ShieldCheck className="w-6 h-6 text-accent" />
                <span>Secure-FEPRH</span>
              </div>
              <button 
                onClick={() => setShowMobileMenu(false)}
                className="text-text-muted hover:text-text-main"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-1">
              {visibleItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setShowMobileMenu(false)}
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
                onClick={() => setShowMobileMenu(false)}
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
                onClick={() => setShowMobileMenu(false)}
                className="nav-item mt-1"
              >
                <LogOut className="w-5 h-5" />
                {t('logout')}
              </NavLink>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </>
  );
}
