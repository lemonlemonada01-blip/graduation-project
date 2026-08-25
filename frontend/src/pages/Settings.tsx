// Fake save handler with setTimeout replaced by actual settingsApi
import { motion, AnimatePresence } from "framer-motion";
import { User, Lock, Moon, Sun, Monitor, Bell, History, Globe, Shield, Check, Edit2, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { settingsApi, UserProfile, AuditLogItem } from "../lib/api";
import { Avatar } from "../components/ui/Avatar";
import { Skeleton } from "../components/ui/Skeleton";

export function Settings() {
  const { t, i18n } = useTranslation();
  const [theme, setTheme] = useState<"dark" | "light" | "system">("dark");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLogItem[]>([]);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Edit Profile Modal
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editDept, setEditDept] = useState("");
  const [editUni, setEditUni] = useState("");


  const loadSettingsData = async () => {
    try {
      setLoading(true);
      const [userRes, logsRes] = await Promise.allSettled([
        settingsApi.getMe(),
        settingsApi.getLogs(),
      ]);

      if (userRes.status === "fulfilled" && userRes.value) {
        setProfile(userRes.value);
        setEditFullName(userRes.value.full_name || "");
        setEditDept(userRes.value.department || "");
        setEditUni(userRes.value.university || "");
      }

      if (logsRes.status === "fulfilled" && logsRes.value?.logs) {
        setLogs(logsRes.value.logs);
      }
    } catch (err) {
      console.warn("Failed to load settings data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettingsData();
  }, []);

  // Handle theme switching
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
    } else {
      root.classList.remove("light");
    }
  }, [theme]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error("Please enter both current and new password");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      setIsUpdatingPassword(true);
      await settingsApi.changePassword(currentPassword, newPassword);
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update password");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await settingsApi.updateMe({
        full_name: editFullName.trim(),
        department: editDept.trim(),
        university: editUni.trim(),
      });
      setProfile(updated);
      toast.success("Profile updated");
      setIsEditProfileOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update profile");
    }
  };

  const language = i18n.language;
  const setLanguage = (lang: string) => i18n.changeLanguage(lang);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        <Skeleton className="h-44 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Profile Header Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent opacity-5 blur-[100px] rounded-full pointer-events-none" />
        
        <Avatar 
          name={profile?.full_name || "Admin User"} 
          className="w-28 h-28 text-3xl font-bold shadow-xl border-4 border-glass-border" 
          colorClass="from-indigo-500 to-purple-600"
        />
        
        <div className="flex-1 text-center md:text-left z-10">
          <h2 className="text-3xl font-bold text-text-main mb-1">
            {profile?.full_name || "Dr. Ahmed Hassan"}
          </h2>
          <p className="text-text-muted mb-3">{profile?.email || "ahmed.hassan@university.edu"}</p>
          
          <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold tracking-wide uppercase mb-4">
            {profile?.role || "Supervisor"}
          </div>
          
          <p className="text-sm text-text-muted">
            {profile?.university || "Cairo University"} → {profile?.department || "Computer Science Department"}
          </p>
        </div>
        
        <button 
          onClick={() => setIsEditProfileOpen(true)}
          className="btn-primary bg-surface/50 border border-glass-border text-text-main hover:bg-accent hover:text-white transition-all z-10"
        >
          <Edit2 className="w-4 h-4" />
          {t('edit_profile')}
        </button>
      </motion.div>

      {/* 3-Column Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Change Password */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card lg:col-span-1 flex flex-col"
        >
          <h3 className="text-lg font-bold text-text-main mb-6 flex items-center gap-2">
            <Lock className="w-5 h-5 text-accent" />
            {t('change_password')}
          </h3>
          <form onSubmit={handlePasswordChange} className="flex flex-col gap-4 flex-1">
            <div className="space-y-1.5">
              <label className="text-xs text-text-muted font-medium">{t('current_password')}</label>
              <input 
                type="password" 
                required
                placeholder="••••••••" 
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input-field w-full" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-text-muted font-medium">{t('new_password')}</label>
              <input 
                type="password" 
                required
                placeholder="••••••••" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-field w-full" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-text-muted font-medium">{t('confirm_password')}</label>
              <input 
                type="password" 
                required
                placeholder="••••••••" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field w-full" 
              />
            </div>
            <div className="mt-auto pt-4">
              <button 
                type="submit" 
                disabled={isUpdatingPassword}
                className="btn-primary w-full justify-center"
              >
                {isUpdatingPassword ? "Updating..." : t('update_password')}
              </button>
            </div>
          </form>
        </motion.div>

        {/* Preferences */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card lg:col-span-1"
        >
          <h3 className="text-lg font-bold text-text-main mb-6">{t('preferences')}</h3>
          <div className="space-y-6">
            <div>
              <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">{t('theme')}</p>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={() => setTheme("dark")}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-colors ${theme === 'dark' ? 'border-accent bg-accent/15 text-accent font-bold' : 'border-glass-border bg-surface text-text-muted hover:text-text-main'}`}
                >
                  <Moon className="w-5 h-5 mb-1" />
                  <span className="text-xs">{t('dark')}</span>
                </button>
                <button 
                  onClick={() => setTheme("light")}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-colors ${theme === 'light' ? 'border-accent bg-accent/15 text-accent font-bold' : 'border-glass-border bg-surface text-text-muted hover:text-text-main'}`}
                >
                  <Sun className="w-5 h-5 mb-1" />
                  <span className="text-xs">{t('light')}</span>
                </button>
                <button 
                  onClick={() => setTheme("system")}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-colors ${theme === 'system' ? 'border-accent bg-accent/15 text-accent font-bold' : 'border-glass-border bg-surface text-text-muted hover:text-text-main'}`}
                >
                  <Monitor className="w-5 h-5 mb-1" />
                  <span className="text-xs">{t('system')}</span>
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">{t('language')}</p>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setLanguage("en")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-colors ${language === 'en' ? 'border-accent bg-accent/15 text-accent font-bold' : 'border-glass-border bg-surface text-text-muted hover:text-text-main'}`}
                >
                  <Globe className="w-4 h-4" />
                  <span className="text-sm">{t('english')}</span>
                </button>
                <button 
                  onClick={() => setLanguage("ar")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-colors ${language === 'ar' ? 'border-accent bg-accent/15 text-accent font-bold' : 'border-glass-border bg-surface text-text-muted hover:text-text-main'}`}
                >
                  <Globe className="w-4 h-4" />
                  <span className="text-sm">{t('arabic')}</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>


      </div>

      {/* Activity Audit Log */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
            <History className="w-5 h-5 text-accent" />
            {t('activity_log')} ({logs.length})
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-glass-border text-text-muted text-xs">
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">{t('action')}</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">{t('user')}</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">{t('time')}</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">{t('ip')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border/40">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-text-muted text-sm">
                    No activity logs recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-text-muted/5 transition-colors">
                    <td className="py-3 px-4 text-sm text-text-main font-medium">{log.action}</td>
                    <td className="py-3 px-4 text-sm text-text-muted">{log.user}</td>
                    <td className="py-3 px-4 text-sm text-text-muted">{log.timestamp}</td>
                    <td className="py-3 px-4 text-sm text-text-muted font-mono text-xs">{log.ip}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* EDIT PROFILE MODAL */}
      <AnimatePresence>
        {isEditProfileOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditProfileOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface/95 border border-glass-border rounded-2xl p-6 w-full max-w-md shadow-2xl z-50 relative"
            >
              <div className="flex items-center justify-between pb-4 border-b border-glass-border mb-4">
                <h3 className="text-lg font-bold text-text-main">Edit User Profile</h3>
                <button onClick={() => setIsEditProfileOpen(false)} className="text-text-muted hover:text-text-main">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-text-main block mb-1">Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="input-field w-full"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-main block mb-1">Department</label>
                  <input 
                    type="text" 
                    value={editDept}
                    onChange={(e) => setEditDept(e.target.value)}
                    className="input-field w-full"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-main block mb-1">University</label>
                  <input 
                    type="text" 
                    value={editUni}
                    onChange={(e) => setEditUni(e.target.value)}
                    className="input-field w-full"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-glass-border">
                  <button 
                    type="button" 
                    onClick={() => setIsEditProfileOpen(false)}
                    className="px-4 py-2 rounded-xl text-sm text-text-muted hover:bg-surface"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
