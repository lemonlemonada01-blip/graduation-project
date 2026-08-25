import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { Search, Edit3, FileText, CheckCircle2, MoreVertical, Plus, Calendar, ArrowLeft, Trash2, Check, X, ShieldAlert, Sparkles } from "lucide-react";
import { Avatar } from "../components/ui/Avatar";
import { Skeleton } from "../components/ui/Skeleton";
import { toast } from "react-hot-toast";
import { projectsApi, ProjectData, ProjectTaskData, ProjectDeliverableData } from "../lib/api";

const KANBAN_STATUSES = ["To Do", "In Progress", "In Review", "Done"];

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Overview");
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);

  // New Task State
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskCategory, setTaskCategory] = useState("Backend");
  const [taskStatus, setTaskStatus] = useState("To Do");
  const [taskAssignee, setTaskAssignee] = useState("");

  // New Deliverable State
  const [isAddDeliverableOpen, setIsAddDeliverableOpen] = useState(false);
  const [delivName, setDelivName] = useState("");
  const [delivType, setDelivType] = useState("PDF Document");
  const [delivSize, setDelivSize] = useState("2.4 MB");

  const loadProject = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await projectsApi.getDetail(id);
      if (res && res.project) {
        setProject(res.project);
      }
    } catch (err) {
      console.warn("Failed to load project details:", err);
      toast.error("Could not load project from database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProject();
  }, [id]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !taskTitle.trim()) return;

    try {
      await projectsApi.createTask(project.id, {
        title: taskTitle.trim(),
        category: taskCategory,
        status: taskStatus,
        assigned_to: taskAssignee.trim() || undefined,
      });
      toast.success("Task created");
      setIsAddTaskOpen(false);
      setTaskTitle("");
      loadProject();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create task");
    }
  };

  const handleUpdateTaskStatus = async (taskId: number, newStatus: string) => {
    if (!project) return;
    try {
      await projectsApi.updateTask(project.id, taskId, { status: newStatus });
      toast.success(`Task moved to ${newStatus}`);
      loadProject();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update task");
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!project) return;
    try {
      await projectsApi.deleteTask(project.id, taskId);
      toast.success("Task deleted");
      loadProject();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete task");
    }
  };

  const handleAddDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !delivName.trim()) return;

    try {
      await projectsApi.createDeliverable(project.id, {
        name: delivName.trim(),
        file_type: delivType,
        file_size: delivSize,
      });
      toast.success("Document uploaded");
      setIsAddDeliverableOpen(false);
      setDelivName("");
      loadProject();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add document");
    }
  };

  const TABS = ['Overview', 'Kanban Tasks', 'Deliverables', 'Plagiarism Audit', 'Biometric Attendance'];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        <Skeleton className="h-10 w-48 mb-4" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-7xl mx-auto text-center py-20">
        <h2 className="text-2xl font-bold text-text-main mb-2">Project Not Found</h2>
        <p className="text-text-muted mb-6">The requested project does not exist or has been removed.</p>
        <button onClick={() => navigate('/projects')} className="btn-primary">
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Back button & Header */}
      <div className="flex flex-col gap-4 mb-8 border-b border-glass-border pb-6">
        <button 
          onClick={() => navigate('/projects')}
          className="text-xs text-text-muted hover:text-accent flex items-center gap-1.5 w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to all projects
        </button>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-main mb-2 flex items-center gap-3 flex-wrap">
              {project.title}
              <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium tracking-wide uppercase">
                {project.status}
              </span>
              <span className="px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-400 text-xs font-medium tracking-wide uppercase">
                {project.domain}
              </span>
            </h1>
            <p className="text-text-muted text-sm">
              Supervised by {project.supervisor} • {project.dept} • {project.year}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/plagiarism')}
              className="btn-primary"
            >
              <Search className="w-4 h-4" />
              Run Plagiarism Scan
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-glass-border mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab 
                ? 'border-accent text-accent font-semibold' 
                : 'border-transparent text-text-muted hover:text-text-main'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card lg:col-span-2 space-y-4"
          >
            <h3 className="text-lg font-bold text-text-main">Abstract & Research Scope</h3>
            <p className="text-text-muted leading-relaxed text-sm">
              {project.abstract || "This project is focused on advancing core domain research, real-time AI security heuristics, and robust engineering architecture. The scope includes cross-validation of requirements, biometric verified session tracking, and rigorous structural code integrity checks."}
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-glass-border">
              <div>
                <p className="text-xs text-text-muted font-semibold">DEPARTMENT</p>
                <p className="text-sm font-medium text-text-main mt-0.5">{project.dept}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted font-semibold">ACADEMIC YEAR</p>
                <p className="text-sm font-medium text-text-main mt-0.5">{project.year}</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card space-y-4"
          >
            <h3 className="text-lg font-bold text-text-main">Assigned Team</h3>
            {project.team ? (
              <div>
                <div className="mb-3">
                  <h4 className="font-semibold text-accent text-sm">{project.team.name}</h4>
                  <p className="text-xs text-text-muted">{project.team.department} • {project.team.university}</p>
                </div>
                <div className="space-y-3">
                  {(project.team.members || []).map((m, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={m.name} className="w-8 h-8 text-xs" colorClass={project.team?.color_gradient} />
                        <div>
                          <div className="text-xs font-semibold text-text-main">{m.name}</div>
                          <div className="text-[10px] text-text-muted">{m.email}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-surface border border-glass-border text-text-muted">
                        {m.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-text-muted">No dedicated team linked yet.</p>
            )}
          </motion.div>
        </div>
      )}

      {/* TAB 2: KANBAN TASKS */}
      {activeTab === 'Kanban Tasks' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button 
              onClick={() => setIsAddTaskOpen(true)}
              className="btn-primary text-xs"
            >
              <Plus className="w-4 h-4" /> Add Task
            </button>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex gap-6 overflow-x-auto pb-4">
            {KANBAN_STATUSES.map(status => {
              const statusTasks = (project.tasks || []).filter(t => t.status === status);
              return (
                <div key={status} className="glass-panel border-none bg-text-muted/5 p-4 min-w-[300px] flex flex-col gap-3 rounded-xl flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-semibold text-text-main">{status}</h4>
                    <span className="text-xs font-medium text-text-muted bg-text-muted/10 px-2 py-0.5 rounded-full">{statusTasks.length}</span>
                  </div>

                  <div className="space-y-3 flex-1">
                    {statusTasks.map(t => (
                      <div key={t.id} className="glass-card p-3 bg-surface/90 hover:border-accent transition-colors shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400">
                            {t.category}
                          </span>
                          <button 
                            onClick={() => handleDeleteTask(t.id)}
                            className="text-text-muted hover:text-red-400 p-1"
                            title="Delete task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-sm text-text-main font-medium mb-3">{t.title}</p>
                        
                        <div className="flex justify-between items-center pt-2 border-t border-glass-border/40 text-xs">
                          <span className="text-text-muted">{t.assigned_to || "Unassigned"}</span>
                          <select 
                            value={t.status}
                            onChange={(e) => handleUpdateTaskStatus(t.id, e.target.value)}
                            className="bg-surface text-[10px] text-text-muted rounded border border-glass-border px-1.5 py-0.5"
                          >
                            {KANBAN_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </motion.div>
        </div>
      )}

      {/* TAB 3: DELIVERABLES */}
      {activeTab === 'Deliverables' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-0 overflow-hidden">
          <div className="p-5 border-b border-glass-border flex justify-between items-center">
            <h3 className="text-lg font-semibold text-text-main">Project Documents & Deliverables</h3>
            <button 
              onClick={() => setIsAddDeliverableOpen(true)}
              className="btn-primary text-xs"
            >
              <Plus className="w-4 h-4" /> Add Deliverable
            </button>
          </div>
          <div className="divide-y divide-glass-border">
            {(project.deliverables && project.deliverables.length > 0) ? (
              project.deliverables.map((file, i) => (
                <div key={i} className="flex items-center justify-between p-4 hover:bg-text-muted/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-accent p-1.5 bg-accent/10 rounded-lg" />
                    <div>
                      <div className="text-sm font-medium text-text-main">{file.name}</div>
                      <div className="text-xs text-text-muted">{file.file_size} • {file.file_type} • Uploaded {file.uploaded_at}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-text-muted text-sm">
                No deliverables uploaded yet.
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* TAB 4: PLAGIARISM AUDIT */}
      {activeTab === 'Plagiarism Audit' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-text-main mb-2">Automated Code & Text Integrity Ready</h3>
          <p className="text-text-muted max-w-md mx-auto mb-6 text-sm">
            Execute a comprehensive scan on this project using AST Parser, MinHash LSH shingling, and CodeBERT neural embeddings.
          </p>
          <button 
            onClick={() => navigate('/plagiarism')}
            className="btn-primary"
          >
            <Search className="w-4 h-4" /> Open Plagiarism Inspector
          </button>
        </motion.div>
      )}

      {/* TAB 5: BIOMETRIC ATTENDANCE */}
      {activeTab === 'Biometric Attendance' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 space-y-4">
          <h3 className="text-lg font-bold text-text-main">3D Biometric Facial Attendance</h3>
          <p className="text-text-muted text-sm">
            All attendance entries for this project are cryptographically tied to student facial embeddings verified via MiniFASNetV2 anti-spoofing.
          </p>
          <div className="pt-2">
            <button 
              onClick={() => navigate('/attendance')}
              className="btn-primary text-xs"
            >
              Go to Live Attendance Scanner
            </button>
          </div>
        </motion.div>
      )}

      {/* ADD TASK MODAL */}
      <AnimatePresence>
        {isAddTaskOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddTaskOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface/95 border border-glass-border rounded-2xl p-6 w-full max-w-md shadow-2xl z-50 relative"
            >
              <div className="flex items-center justify-between pb-4 border-b border-glass-border mb-4">
                <h3 className="text-lg font-bold text-text-main">Create New Task</h3>
                <button onClick={() => setIsAddTaskOpen(false)} className="text-text-muted hover:text-text-main">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddTask} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-text-main block mb-1">Task Title *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Design Database Schema"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="input-field w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text-main block mb-1">Category</label>
                    <select 
                      value={taskCategory}
                      onChange={(e) => setTaskCategory(e.target.value)}
                      className="input-field w-full"
                    >
                      <option value="Backend">Backend</option>
                      <option value="Frontend">Frontend</option>
                      <option value="AI/ML">AI/ML</option>
                      <option value="Security">Security</option>
                      <option value="Documentation">Documentation</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-main block mb-1">Status</label>
                    <select 
                      value={taskStatus}
                      onChange={(e) => setTaskStatus(e.target.value)}
                      className="input-field w-full"
                    >
                      {KANBAN_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-main block mb-1">Assignee</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Sarah Chen"
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    className="input-field w-full"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-glass-border">
                  <button 
                    type="button" 
                    onClick={() => setIsAddTaskOpen(false)}
                    className="px-4 py-2 rounded-xl text-sm text-text-muted hover:bg-surface"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Create Task
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD DELIVERABLE MODAL */}
      <AnimatePresence>
        {isAddDeliverableOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddDeliverableOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface/95 border border-glass-border rounded-2xl p-6 w-full max-w-md shadow-2xl z-50 relative"
            >
              <div className="flex items-center justify-between pb-4 border-b border-glass-border mb-4">
                <h3 className="text-lg font-bold text-text-main">Add Project Deliverable</h3>
                <button onClick={() => setIsAddDeliverableOpen(false)} className="text-text-muted hover:text-text-main">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddDeliverable} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-text-main block mb-1">Document Name *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. System_Architecture_Specification.pdf"
                    value={delivName}
                    onChange={(e) => setDelivName(e.target.value)}
                    className="input-field w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text-main block mb-1">Document Type</label>
                    <input 
                      type="text" 
                      value={delivType}
                      onChange={(e) => setDelivType(e.target.value)}
                      className="input-field w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-main block mb-1">Size</label>
                    <input 
                      type="text" 
                      value={delivSize}
                      onChange={(e) => setDelivSize(e.target.value)}
                      className="input-field w-full"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-glass-border">
                  <button 
                    type="button" 
                    onClick={() => setIsAddDeliverableOpen(false)}
                    className="px-4 py-2 rounded-xl text-sm text-text-muted hover:bg-surface"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Upload
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
