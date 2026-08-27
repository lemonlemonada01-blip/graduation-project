import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Phone, MapPin, MoreHorizontal, Edit, Trash2, UserX, Plus, Users, Search, X, Check } from "lucide-react";
import { Avatar } from "../components/ui/Avatar";
import { Skeleton } from "../components/ui/Skeleton";
import { useTranslation } from "react-i18next";
import { useOnClickOutside } from "../hooks/useOnClickOutside";
import { toast } from "react-hot-toast";
import { useRole } from "../hooks/useRole";
import { teamsApi, TeamData, TeamMemberData } from "../lib/api";

const COLOR_OPTIONS = [
  { label: "Indigo Purple", value: "from-indigo-500 to-purple-600" },
  { label: "Blue Cyan", value: "from-blue-500 to-cyan-500" },
  { label: "Emerald Teal", value: "from-emerald-500 to-teal-600" },
  { label: "Orange Red", value: "from-orange-500 to-red-500" },
  { label: "Pink Rose", value: "from-pink-500 to-rose-600" },
  { label: "Violet Fuchsia", value: "from-violet-500 to-fuchsia-600" },
];

export function Teams() {
  const { t } = useTranslation();
  const { can } = useRole();
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  
  // Modals state
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [activeTeamForMember, setActiveTeamForMember] = useState<number | null>(null);

  // New Team Form State
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDesc, setNewTeamDesc] = useState("");
  const [newTeamDept, setNewTeamDept] = useState("");
  const [newTeamUni, setNewTeamUni] = useState("");
  const [newTeamColor, setNewTeamColor] = useState(COLOR_OPTIONS[0].value);

  // New Member Form State
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("Research Member");
  const [newMemberPhone, setNewMemberPhone] = useState("");

  const menuRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(menuRef, () => setActiveMenuId(null));

  const loadTeams = async () => {
    try {
      setLoading(true);
      const res = await teamsApi.getAll();
      if (res && res.teams) {
        setTeams(res.teams);
      }
    } catch (e) {
      console.error("Failed to load teams:", e);
      toast.error("Failed to load teams from database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) {
      toast.error("Team name is required");
      return;
    }

    try {
      await teamsApi.create({
        name: newTeamName.trim(),
        description: newTeamDesc.trim(),
        department: newTeamDept,
        university: newTeamUni,
        color_gradient: newTeamColor,
      });
      toast.success(`Team "${newTeamName}" created successfully!`);
      setIsCreateTeamOpen(false);
      setNewTeamName("");
      setNewTeamDesc("");
      loadTeams();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create team");
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeamForMember || !newMemberName.trim() || !newMemberEmail.trim()) {
      toast.error("Name and email are required");
      return;
    }

    try {
      await teamsApi.addMember(activeTeamForMember, {
        name: newMemberName.trim(),
        email: newMemberEmail.trim(),
        role_in_team: newMemberRole.trim(),
        phone: newMemberPhone.trim(),
      });
      toast.success(`Member added to team!`);
      setIsAddMemberOpen(false);
      setNewMemberName("");
      setNewMemberEmail("");
      setNewMemberRole("Research Member");
      setNewMemberPhone("");
      loadTeams();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add member");
    }
  };

  const handleDeleteTeam = async (teamId: number, teamName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${teamName}"?`)) return;
    try {
      await teamsApi.delete(teamId);
      toast.success(`Team "${teamName}" deleted.`);
      setActiveMenuId(null);
      setTeams(prev => prev.filter(t => t.id !== teamId));
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete team");
    }
  };

  const handleRemoveMember = async (teamId: number, memberId?: number) => {
    if (!memberId) return;
    if (!window.confirm("Remove this member from the team?")) return;
    try {
      await teamsApi.removeMember(teamId, memberId);
      toast.success("Member removed.");
      loadTeams();
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove member");
    }
  };

  // Flatten all members for directory view with their respective teams
  const allMembers = teams.flatMap(team => 
    (team.members || []).map(m => ({
      ...m,
      teamId: team.id,
      teamName: team.name,
      department: team.department,
      university: team.university,
      color: team.color_gradient || "from-indigo-500 to-purple-600",
    }))
  );

  const filteredMembers = allMembers.filter(m => {
    const matchesSearch = 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.teamName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDept === "All" || m.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  const departments = ["All", ...Array.from(new Set(teams.map(t => t.department).filter(Boolean)))];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-64 rounded-2xl border border-glass-border" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-text-main tracking-tight">{t("team_directory")}</h2>
          <p className="text-sm text-text-muted mt-1">
            {teams.length} active teams • {allMembers.length} verified researchers and supervisors
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder={t("search_members")} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field w-full pl-9"
            />
          </div>
          {can("Admin", "Instructor") && (
            <button
              onClick={() => setIsCreateTeamOpen(true)}
              className="btn-primary whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Create Team
            </button>
          )}
        </div>
      </div>

      {/* Department Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {departments.map(dept => (
          <button
            key={dept}
            onClick={() => setSelectedDept(dept)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedDept === dept 
                ? 'bg-accent text-white shadow-lg shadow-accent/20' 
                : 'bg-surface/50 border border-glass-border text-text-muted hover:text-text-main'
            }`}
          >
            {dept}
          </button>
        ))}
      </div>

      {/* Teams Overview Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
            <Users className="w-5 h-5 text-accent" />
            Active Research Teams
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team, idx) => (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="glass-card relative overflow-hidden flex flex-col justify-between group"
            >
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${team.color_gradient || 'from-indigo-500 to-purple-600'}`} />

              <div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-lg text-text-main group-hover:text-accent transition-colors">
                      {team.name}
                    </h4>
                    <p className="text-xs text-text-muted">{team.department} • {team.university}</p>
                  </div>

                    {can("Admin", "Instructor") && (
                      <div className="relative" ref={activeMenuId === team.id ? menuRef : null}>

                    <button
                      onClick={() => setActiveMenuId(activeMenuId === team.id ? null : team.id)}
                      className="text-text-muted hover:text-text-main p-1 rounded-lg hover:bg-surface transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    <AnimatePresence>
                      {activeMenuId === team.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 5 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 5 }}
                          className="absolute right-0 top-full mt-1 w-44 bg-surface/95 backdrop-blur-xl rounded-xl shadow-2xl z-50 border border-glass-border overflow-hidden"
                        >
                          <button
                            onClick={() => {
                              setActiveTeamForMember(team.id);
                              setIsAddMemberOpen(true);
                              setActiveMenuId(null);
                            }}
                            className="w-full px-3 py-2 text-left text-xs text-text-main hover:bg-accent/10 hover:text-accent transition-colors flex items-center gap-2"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Member
                          </button>
                          <button
                            onClick={() => handleDeleteTeam(team.id, team.name)}
                            className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2 border-t border-glass-border"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete Team
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                      </div>
                    )}
                </div>

                {team.description && (
                  <p className="text-xs text-text-muted mb-4 line-clamp-2">
                    {team.description}
                  </p>
                )}

                <div className="space-y-2 mt-4 pt-4 border-t border-glass-border">
                  <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                    Members ({team.members?.length || 0})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(team.members || []).map((m, i) => (
                      <span 
                        key={i} 
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface/80 border border-glass-border text-xs text-text-main"
                      >
                        <Avatar name={m.name} className="w-4 h-4 text-[8px]" colorClass={team.color_gradient} />
                        <span>{m.name}</span>
                        {m.id && can("Admin", "Instructor") && (
                          <button
                            onClick={() => handleRemoveMember(team.id, m.id)}
                            className="text-text-muted hover:text-red-400 ml-1"
                            title="Remove member"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-glass-border flex justify-between items-center">
                {can("Admin", "Instructor") && (
                  <button
                    onClick={() => {
                      setActiveTeamForMember(team.id);
                      setIsAddMemberOpen(true);
                    }}
                    className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Member
                  </button>
                )}
                <span className="text-[11px] text-text-muted font-mono">ID: #{team.id}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Member Directory Grid */}
      <div className="space-y-4 pt-6">
        <h3 className="text-lg font-bold text-text-main">
          All Team Members ({filteredMembers.length})
        </h3>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.05 }}
        >
          {filteredMembers.map((member, idx) => (
            <motion.div 
              key={`${member.teamId}-${member.id || idx}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="glass-card hover:border-accent/50 transition-colors group relative overflow-visible"
            >
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${member.color}`} />
              
              <div className="flex justify-between items-start mb-4 relative">
                <Avatar name={member.name} className="w-14 h-14 text-xl" colorClass={member.color} />
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-surface border border-glass-border text-text-muted uppercase">
                  {member.teamName}
                </span>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-bold text-text-main leading-tight mb-1">{member.name}</h3>
                <p className="text-sm text-accent font-medium">{member.role}</p>
              </div>

              <div className="space-y-3 pt-4 border-t border-glass-border">
                <div className="flex items-center gap-3 text-sm text-text-muted group-hover:text-text-main transition-colors">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{member.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-text-muted group-hover:text-text-main transition-colors">
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  <span>{member.phone || "No phone provided"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-text-muted group-hover:text-text-main transition-colors">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span>{member.university || "No university provided"}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* CREATE TEAM MODAL */}
      <AnimatePresence>
        {isCreateTeamOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateTeamOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface/95 border border-glass-border rounded-2xl p-6 w-full max-w-lg shadow-2xl z-50 relative"
            >
              <div className="flex items-center justify-between pb-4 border-b border-glass-border mb-4">
                <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                  <Users className="w-5 h-5 text-accent" />
                  Create New Research Team
                </h3>
                <button onClick={() => setIsCreateTeamOpen(false)} className="text-text-muted hover:text-text-main">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTeam} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-text-main block mb-1">Team Name *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. AI Attendance Research Group"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="input-field w-full"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-main block mb-1">Department</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Computer Science"
                    value={newTeamDept}
                    onChange={(e) => setNewTeamDept(e.target.value)}
                    className="input-field w-full"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-main block mb-1">University</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Cairo University"
                    value={newTeamUni}
                    onChange={(e) => setNewTeamUni(e.target.value)}
                    className="input-field w-full"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-main block mb-1">Color Theme</label>
                  <div className="grid grid-cols-3 gap-2">
                    {COLOR_OPTIONS.map((col) => (
                      <button
                        type="button"
                        key={col.value}
                        onClick={() => setNewTeamColor(col.value)}
                        className={`p-2 rounded-xl border text-xs font-medium flex items-center justify-between transition-all ${
                          newTeamColor === col.value 
                            ? 'border-accent bg-accent/10 text-accent font-bold' 
                            : 'border-glass-border bg-surface text-text-muted'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded-full bg-gradient-to-r ${col.value}`} />
                        <span>{col.label.split(" ")[0]}</span>
                        {newTeamColor === col.value && <Check className="w-3 h-3 text-accent" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-main block mb-1">Description</label>
                  <textarea 
                    placeholder="Research focus, project goals..."
                    value={newTeamDesc}
                    onChange={(e) => setNewTeamDesc(e.target.value)}
                    className="input-field w-full min-h-[70px]"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-glass-border">
                  <button
                    type="button" 
                    onClick={() => setIsCreateTeamOpen(false)}
                    className="px-4 py-2 rounded-xl text-sm text-text-muted hover:bg-surface transition-colors"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Create Team
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD MEMBER MODAL */}
      <AnimatePresence>
        {isAddMemberOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddMemberOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface/95 border border-glass-border rounded-2xl p-6 w-full max-w-md shadow-2xl z-50 relative"
            >
              <div className="flex items-center justify-between pb-4 border-b border-glass-border mb-4">
                <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                  <Plus className="w-5 h-5 text-accent" />
                  Add Team Member
                </h3>
                <button onClick={() => setIsAddMemberOpen(false)} className="text-text-muted hover:text-text-main">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddMember} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-text-main block mb-1">Full Name *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Dr. Youssef Nabil"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className="input-field w-full"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-main block mb-1">Email Address *</label>
                  <input 
                    type="email" 
                    required
                    placeholder="youssef@university.edu"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    className="input-field w-full"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-main block mb-1">Role in Team</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Senior Researcher, UI Designer"
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    className="input-field w-full"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-main block mb-1">Phone Number</label>
                  <input 
                    type="text" 
                    placeholder="+20 123 456 7890"
                    value={newMemberPhone}
                    onChange={(e) => setNewMemberPhone(e.target.value)}
                    className="input-field w-full"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-glass-border">
                  <button
                    type="button" 
                    onClick={() => setIsAddMemberOpen(false)}
                    className="px-4 py-2 rounded-xl text-sm text-text-muted hover:bg-surface transition-colors"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Add Member
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
