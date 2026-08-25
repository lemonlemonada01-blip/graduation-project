import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, KeyRound, X, Check, Search, ShieldAlert, Loader2, Filter } from "lucide-react";
import { Skeleton } from "../components/ui/Skeleton";
import { Select } from "../components/ui/Select";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { usersApi, UserProfileData } from "../lib/api";

const PERMISSIONS: Record<string, string[]> = {
  "Ministry Admin": [
    "Manage All Universities",
    "System Configuration",
    "Approve Global Projects",
    "View All Reports"
  ],
  "University Admin": [
    "Manage Department Users",
    "Approve Department Projects",
    "View University Reports",
    "Manage Role Assignments"
  ],
  "Supervisor": [
    "Propose Projects",
    "Grade Student Submissions",
    "View Plagiarism Reports",
    "Schedule Meetings"
  ],
  "Student": [
    "Submit Project Proposals",
    "Upload Deliverables",
    "View Own Grades",
    "Join Meetings"
  ]
};

const ITEMS_PER_PAGE = 8;

export function UserManagement() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfileData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Add User Drawer State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "Student",
    university: "Cairo University",
    department: "Computer Science"
  });

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<UserProfileData | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    role: "Student",
    uni: "Cairo University",
    dept: "Computer Science",
    status: "Active"
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete User Dialog State
  const [deletingUser, setDeletingUser] = useState<UserProfileData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Password Reset Dialog State
  const [resettingUser, setResettingUser] = useState<UserProfileData | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await usersApi.getAll();
      if (res && res.users) {
        setUsers(res.users);
      }
    } catch (err) {
      console.error("Failed to load users from backend:", err);
      toast.error(t("failed_load_users") || "Failed to load users from database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = !searchQuery || 
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.dept.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.uni.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRole = !roleFilter || u.role === roleFilter;
      const matchesStatus = !statusFilter || u.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, statusFilter]);

  // Toggle user status
  const handleToggleStatus = async (user: UserProfileData) => {
    const nextStatus = user.status === "Active" ? "Inactive" : "Active";
    // Optimistic UI update
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: nextStatus } : u));
    try {
      await usersApi.updateStatus(user.id, nextStatus);
      toast.success(`${user.name} status updated to ${nextStatus}`);
    } catch (err) {
      console.error("Status update error:", err);
      toast.error("Failed to update status");
      // Rollback
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: user.status } : u));
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (user: UserProfileData) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      uni: user.uni,
      dept: user.dept,
      status: user.status
    });
  };

  // Submit Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      setIsUpdating(true);
      await usersApi.update(editingUser.id, {
        full_name: editFormData.name,
        email: editFormData.email,
        role: editFormData.role,
        university: editFormData.uni,
        department: editFormData.dept,
        status: editFormData.status
      });
      setUsers(prev => prev.map(u => u.id === editingUser.id ? {
        ...u,
        name: editFormData.name,
        email: editFormData.email,
        role: editFormData.role,
        uni: editFormData.uni,
        dept: editFormData.dept,
        status: editFormData.status
      } : u));
      toast.success(`User ${editFormData.name} updated successfully!`);
      setEditingUser(null);
    } catch (err) {
      console.error("Failed to update user:", err);
      toast.error("Failed to update user details.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Submit Delete
  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    try {
      setIsDeleting(true);
      await usersApi.delete(deletingUser.id);
      setUsers(prev => prev.filter(u => u.id !== deletingUser.id));
      toast.success(`User ${deletingUser.name} removed successfully.`);
      setDeletingUser(null);
    } catch (err) {
      console.error("Failed to delete user:", err);
      toast.error("Failed to delete user.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Submit Password Reset
  const handleResetPassword = async (user: UserProfileData) => {
    try {
      setIsResetting(true);
      setResettingUser(user);
      const res = await usersApi.resetPassword(user.id);
      setTempPassword(res.temp_password);
      toast.success(`Password reset for ${user.name}`);
    } catch (err) {
      console.error("Password reset error:", err);
      toast.error("Failed to reset password.");
      setResettingUser(null);
    } finally {
      setIsResetting(false);
    }
  };

  // Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.password) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await usersApi.create({
        full_name: formData.fullName,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        university: formData.university,
        department: formData.department,
        status: "Active"
      });
      toast.success(`User account for ${formData.fullName} provisioned!`);
      setIsAddUserOpen(false);
      setFormData({
        fullName: "",
        email: "",
        password: "",
        role: "Student",
        university: "Cairo University",
        department: "Computer Science"
      });
      fetchUsers();
    } catch (err) {
      console.error("Failed to provision user:", err);
      toast.error("Failed to provision account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex gap-4 w-full md:w-auto">
            <Skeleton className="h-10 w-full md:w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-[600px] rounded-2xl border border-glass-border" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input 
              type="text" 
              placeholder={t('search_users') || "Search by name, email, department..."} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field w-full pl-9 rtl:pr-9 rtl:pl-4"
            />
          </div>
          <Select 
            value={roleFilter}
            onChange={setRoleFilter}
            options={[
              { value: "", label: t('all_roles') || "All Roles" },
              { value: "Student", label: "Student" },
              { value: "Supervisor", label: "Supervisor" },
              { value: "University Admin", label: "University Admin" },
              { value: "Ministry Admin", label: "Ministry Admin" },
            ]}
            className="w-40 z-30"
          />
          <Select 
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "", label: t('all_statuses') || "All Statuses" },
              { value: "Active", label: "Active" },
              { value: "Inactive", label: "Inactive" },
            ]}
            className="w-36 z-30"
          />
        </div>
        
        <button onClick={() => navigate('/users/add')} className="btn-primary whitespace-nowrap shadow-lg shadow-accent/20">
          <Plus className="w-4 h-4" />
          {t('add_user') || "Add User"}
        </button>
      </div>

      {/* Users Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-0 overflow-hidden"
      >
        <div className="p-6 border-b border-glass-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-main flex items-center gap-2">
            {t('users_table') || "Registered Users Directory"}
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-accent/20 text-accent font-semibold">
              {filteredUsers.length}
            </span>
          </h2>
          <button onClick={fetchUsers} className="text-xs text-text-muted hover:text-accent transition-colors flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
        
        <div className="overflow-x-auto pb-4 custom-scrollbar">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-text-muted bg-background/50 border-b border-glass-border">
              <tr>
                <th className="font-medium px-6 py-4">{t('name') || "Name"}</th>
                <th className="font-medium px-6 py-4">{t('email') || "Email"}</th>
                <th className="font-medium px-6 py-4">{t('role') || "Role"}</th>
                <th className="font-medium px-6 py-4">{t('department') || "Department"}</th>
                <th className="font-medium px-6 py-4">{t('university') || "University"}</th>
                <th className="font-medium px-6 py-4">{t('status') || "Status"}</th>
                <th className="font-medium px-6 py-4 text-right">{t('actions') || "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-text-muted">
                    No users found matching your search criteria.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-text-muted/5 transition-colors text-text-main">
                    <td className="px-6 py-4 font-semibold">{user.name}</td>
                    <td className="px-6 py-4 text-text-muted font-mono text-xs">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap
                        ${user.role.includes('Admin') ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : ''}
                        ${user.role === 'Supervisor' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : ''}
                        ${user.role === 'Student' ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30' : ''}
                      `}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">{user.dept}</td>
                    <td className="px-6 py-4 text-text-muted">{user.uni}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${user.status === 'Active' ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-rose-500'}`} />
                        <span className={`text-xs font-medium ${user.status === 'Active' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {user.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Edit Button */}
                        <button 
                          onClick={() => handleOpenEdit(user)}
                          title="Edit User"
                          className="p-2 bg-surface/50 hover:bg-surface/80 border border-glass-border rounded-lg text-text-muted hover:text-accent transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Reset Password Button */}
                        <button 
                          onClick={() => handleResetPassword(user)}
                          title="Reset Password"
                          className="p-2 bg-surface/50 hover:bg-surface/80 border border-glass-border rounded-lg text-text-muted hover:text-amber-400 transition-colors"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete User Button */}
                        <button 
                          onClick={() => setDeletingUser(user)}
                          title="Delete User"
                          className="p-2 bg-surface/50 hover:bg-rose-500/20 border border-glass-border hover:border-rose-500/40 rounded-lg text-text-muted hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Status Toggle */}
                        <div 
                          onClick={() => handleToggleStatus(user)}
                          title={user.status === 'Active' ? 'Deactivate User' : 'Activate User'}
                          className={`w-9 h-5 rounded-full p-0.5 cursor-pointer transition-colors ${user.status === 'Active' ? 'bg-accent' : 'bg-slate-700'}`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full transition-transform ${user.status === 'Active' ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Dynamic Pagination Bar */}
        <div className="p-4 border-t border-glass-border flex items-center justify-between text-sm text-text-muted">
          <span>
            Showing {filteredUsers.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length} users
          </span>
          <div className="flex gap-1">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-glass-border bg-surface/30 hover:bg-surface/60 text-text-muted disabled:opacity-30 disabled:cursor-not-allowed"
            >
              &lt;
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button 
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg border text-xs font-semibold ${
                  pageNum === currentPage 
                    ? 'bg-accent text-white border-accent shadow-md shadow-accent/20' 
                    : 'border-glass-border bg-surface/30 hover:bg-surface/60 text-text-muted'
                }`}
              >
                {pageNum}
              </button>
            ))}
            <button 
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-glass-border bg-surface/30 hover:bg-surface/60 text-text-muted disabled:opacity-30 disabled:cursor-not-allowed"
            >
              &gt;
            </button>
          </div>
        </div>
      </motion.div>

      {/* PROVISION NEW USER DRAWER */}
      <AnimatePresence>
        {isAddUserOpen && createPortal(
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddUserOpen(false)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-[#0F172A] border-l border-white/10 shadow-2xl z-[101] flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-glass-border">
                <div>
                  <h2 className="text-xl font-bold text-text-main">Provision New Account</h2>
                  <p className="text-xs text-text-muted mt-0.5">Create and register a verified account in the database</p>
                </div>
                <button 
                  onClick={() => setIsAddUserOpen(false)}
                  className="p-2 text-text-muted hover:text-text-main bg-text-muted/10 hover:bg-text-muted/20 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Account Credentials</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-text-muted">Full Name *</label>
                      <input 
                        type="text" 
                        required
                        value={formData.fullName}
                        onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                        className="input-field w-full" 
                        placeholder="Dr. Ahmed Hassan" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-text-muted">Email Address *</label>
                      <input 
                        type="email" 
                        required
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className="input-field w-full" 
                        placeholder="ahmed.hassan@uni.edu" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-text-muted">Initial Password *</label>
                    <input 
                      type="password" 
                      required
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      className="input-field w-full" 
                      placeholder="••••••••" 
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-text-muted">University</label>
                      <input 
                        type="text" 
                        value={formData.university}
                        onChange={e => setFormData({ ...formData, university: e.target.value })}
                        className="input-field w-full" 
                        placeholder="Cairo University" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-text-muted">Department</label>
                      <input 
                        type="text" 
                        value={formData.department}
                        onChange={e => setFormData({ ...formData, department: e.target.value })}
                        className="input-field w-full" 
                        placeholder="Computer Science" 
                      />
                    </div>
                  </div>
                </div>

                {/* Role Selection */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Role Assignment</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.keys(PERMISSIONS).map(role => (
                      <button
                        type="button"
                        key={role}
                        onClick={() => setFormData({ ...formData, role })}
                        className={`p-3.5 rounded-xl border text-left transition-all duration-200 ${
                          formData.role === role 
                            ? 'bg-accent/15 border-accent text-accent shadow-sm shadow-accent/20' 
                            : 'bg-surface/40 border-glass-border hover:border-accent/40 text-text-muted hover:text-text-main'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-xs font-bold ${formData.role === role ? 'text-accent' : 'text-text-main'}`}>
                            {role}
                          </span>
                          <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                            formData.role === role ? 'border-accent' : 'border-text-muted/40'
                          }`}>
                            {formData.role === role && <div className="w-1.5 h-1.5 rounded-full bg-accent" />}
                          </div>
                        </div>
                        <p className="text-[11px] text-text-muted line-clamp-2">
                          {role === "Ministry Admin" && "System configuration and multi-university oversight."}
                          {role === "University Admin" && "Manage department resources and user provisions."}
                          {role === "Supervisor" && "Oversee student projects, grading, and plagiarism audits."}
                          {role === "Student" && "Participate in projects and biometric session attendance."}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Permissions Preview */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Granted RBAC Capabilities</h3>
                  <div className="bg-surface/50 rounded-xl p-4 border border-glass-border">
                    <ul className="space-y-2.5">
                      {PERMISSIONS[formData.role]?.map((perm, idx) => (
                        <li key={idx} className="flex items-center gap-2.5 text-xs text-text-main">
                          <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" strokeWidth={3} />
                          </div>
                          {perm}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="p-4 border-t border-glass-border bg-surface/50 flex justify-end gap-3 rounded-xl mt-6">
                  <button 
                    type="button" 
                    onClick={() => setIsAddUserOpen(false)} 
                    className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-main transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="btn-primary flex items-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Provision Account
                  </button>
                </div>
              </form>
            </motion.div>
          </>,
          document.body
        )}
      </AnimatePresence>

      {/* EDIT USER MODAL */}
      <AnimatePresence>
        {editingUser && createPortal(
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingUser(null)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100]"
            />
            <div className="fixed inset-0 flex items-center justify-center z-[101] p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-[#0F172A] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
              >
                <div className="p-6 border-b border-glass-border flex items-center justify-between">
                  <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                    <Edit2 className="w-4 h-4 text-accent" />
                    Edit User Profile
                  </h3>
                  <button onClick={() => setEditingUser(null)} className="p-1 rounded-lg text-text-muted hover:text-text-main">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-text-muted">Full Name</label>
                    <input 
                      type="text" 
                      required
                      value={editFormData.name}
                      onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="input-field w-full" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-text-muted">Email Address</label>
                    <input 
                      type="email" 
                      required
                      value={editFormData.email}
                      onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                      className="input-field w-full" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-text-muted">Role</label>
                      <Select 
                        value={editFormData.role}
                        onChange={val => setEditFormData({ ...editFormData, role: val })}
                        options={[
                          { value: "Student", label: "Student" },
                          { value: "Supervisor", label: "Supervisor" },
                          { value: "University Admin", label: "University Admin" },
                          { value: "Ministry Admin", label: "Ministry Admin" },
                        ]}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-text-muted">Status</label>
                      <Select 
                        value={editFormData.status}
                        onChange={val => setEditFormData({ ...editFormData, status: val })}
                        options={[
                          { value: "Active", label: "Active" },
                          { value: "Inactive", label: "Inactive" },
                        ]}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-text-muted">University</label>
                      <input 
                        type="text" 
                        value={editFormData.uni}
                        onChange={e => setEditFormData({ ...editFormData, uni: e.target.value })}
                        className="input-field w-full" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-text-muted">Department</label>
                      <input 
                        type="text" 
                        value={editFormData.dept}
                        onChange={e => setEditFormData({ ...editFormData, dept: e.target.value })}
                        className="input-field w-full" 
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end gap-3 border-t border-glass-border">
                    <button 
                      type="button" 
                      onClick={() => setEditingUser(null)} 
                      className="px-4 py-2 text-sm text-text-muted hover:text-text-main"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={isUpdating}
                      className="btn-primary flex items-center gap-2"
                    >
                      {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                      Save Changes
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </>,
          document.body
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION DIALOG */}
      <AnimatePresence>
        {deletingUser && createPortal(
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingUser(null)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100]"
            />
            <div className="fixed inset-0 flex items-center justify-center z-[101] p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-[#0F172A] border border-rose-500/30 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
              >
                <div className="flex items-center gap-3 text-rose-400">
                  <div className="p-2.5 bg-rose-500/20 rounded-xl">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">Confirm User Deletion</h3>
                    <p className="text-xs text-text-muted">This action is permanent and cannot be undone.</p>
                  </div>
                </div>

                <p className="text-sm text-slate-300">
                  Are you sure you want to delete the user account for <strong className="text-white">{deletingUser.name}</strong> (<span className="text-xs font-mono text-slate-400">{deletingUser.email}</span>)?
                </p>

                <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                  <button 
                    onClick={() => setDeletingUser(null)}
                    className="px-4 py-2 text-sm text-text-muted hover:text-white"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-rose-600/30"
                  >
                    {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Delete Account
                  </button>
                </div>
              </motion.div>
            </div>
          </>,
          document.body
        )}
      </AnimatePresence>

      {/* PASSWORD RESET MODAL */}
      <AnimatePresence>
        {resettingUser && tempPassword && createPortal(
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setResettingUser(null); setTempPassword(null); }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100]"
            />
            <div className="fixed inset-0 flex items-center justify-center z-[101] p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-[#0F172A] border border-amber-500/30 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
              >
                <div className="flex items-center gap-3 text-amber-400">
                  <div className="p-2.5 bg-amber-500/20 rounded-xl">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">Password Reset Successfully</h3>
                    <p className="text-xs text-text-muted">A temporary password was generated</p>
                  </div>
                </div>

                <div className="bg-slate-900/80 p-4 rounded-xl border border-white/10 space-y-2">
                  <p className="text-xs text-slate-400">Temporary Password for <strong className="text-white">{resettingUser.name}</strong>:</p>
                  <p className="text-lg font-mono font-bold text-amber-300 tracking-wider select-all">{tempPassword}</p>
                  <p className="text-[11px] text-slate-500">Provide this temporary credential to the user to regain account access.</p>
                </div>

                <div className="flex justify-end pt-2">
                  <button 
                    onClick={() => { setResettingUser(null); setTempPassword(null); }}
                    className="btn-primary"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            </div>
          </>,
          document.body
        )}
      </AnimatePresence>
    </div>
  );
}
