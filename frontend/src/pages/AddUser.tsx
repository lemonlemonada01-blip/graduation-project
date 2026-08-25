import React, { useState } from "react";
import { motion } from "framer-motion";
import { Shield, UserPlus, Check, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Select } from "../components/ui/Select";
import toast from "react-hot-toast";
import { usersApi } from "../lib/api";

export function AddUser() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "student",
    department: "Computer Science",
    university: "Cairo University",
  });
  
  const [permissions, setPermissions] = useState({
    viewProjects: true,
    createProjects: false,
    manageUsers: false,
    viewReports: false,
    manageSystem: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.email || !formData.password) {
      toast.error("Please fill in required fields");
      return;
    }
    
    // Password validation: min 8 chars, 1 uppercase, 1 number
    const pwdRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!pwdRegex.test(formData.password)) {
      toast.error("Password must be at least 8 characters, include 1 uppercase and 1 number");
      return;
    }
    const roleMap: Record<string, string> = {
      student: "Student",
      supervisor: "Supervisor",
      admin: "University Admin"
    };
    try {
      setLoading(true);
      const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim();
      await usersApi.create({
        full_name: fullName,
        email: formData.email.trim(),
        password: formData.password || "Password123!",
        role: roleMap[formData.role] || "Student",
        department: formData.department,
        university: formData.university || "Cairo University",
        status: "Active"
      });
      toast.success(`User account for ${fullName} provisioned successfully!`);
      navigate('/users');
    } catch (err) {
      console.error("Failed to create user:", err);
      toast.error("Failed to provision user account in database.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-accent-light rounded-xl">
          <UserPlus className="w-6 h-6 text-accent" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-text-main">Add New User</h2>
          <p className="text-text-muted">Create a new account and configure permissions</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card"
        >
          <h3 className="text-xl font-bold text-text-main mb-6">Account Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-muted">First Name</label>
              <input 
                required
                type="text" 
                value={formData.firstName}
                onChange={e => setFormData({...formData, firstName: e.target.value})}
                className="input-field w-full" 
                placeholder="John"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-muted">Last Name</label>
              <input 
                required
                type="text" 
                value={formData.lastName}
                onChange={e => setFormData({...formData, lastName: e.target.value})}
                className="input-field w-full" 
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-muted">Email Address</label>
              <input 
                required
                type="email" 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="input-field w-full" 
                placeholder="john.doe@university.edu"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-muted">Password</label>
              <input 
                required
                type="password" 
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="input-field w-full" 
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-muted">Primary Role</label>
              <Select 
                value={formData.role}
                onChange={value => setFormData({...formData, role: value})}
                options={[
                  { value: "student", label: "Student" },
                  { value: "supervisor", label: "Supervisor" },
                  { value: "admin", label: "Administrator" },
                ]}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-muted">Department</label>
              <Select 
                value={formData.department}
                onChange={value => setFormData({...formData, department: value})}
                options={[
                  { value: "Computer Science", label: "Computer Science" },
                  { value: "Information Systems", label: "Information Systems" },
                  { value: "IT", label: "Information Technology" },
                  { value: "AI", label: "Artificial Intelligence" },
                ]}
              />
            </div>
          </div>
        </motion.div>

        {/* Permissions temporarily removed: to be implemented when backend supports RBAC granular permissions */}
        {/*
        <motion.div ...>
          ...
        </motion.div>
        */}

        <div className="flex justify-end gap-4">
          <button 
            type="button" 
            onClick={() => navigate('/users')}
            className="px-6 py-2 rounded-lg font-medium text-text-main bg-text-muted/5 hover:bg-text-muted/10 border border-glass-border transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Create Account
          </button>
        </div>
      </form>
    </div>
  );
}
