import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Plus, LayoutGrid, Kanban, List, X, MessageSquare, Send, Trash2, Download, FolderInput, Search, BookOpen } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";

import { Skeleton } from "../components/ui/Skeleton";
import { Avatar } from "../components/ui/Avatar";
import { Confetti } from "../components/ui/Confetti";
import { Select } from "../components/ui/Select";
import { CollaborativeCursors } from "../components/ui/CollaborativeCursors";
import { projectsApi, ProjectData, ProjectCommentData } from "../lib/api";

const COLUMNS = ["Proposed", "Approved", "In Progress", "Completed"];

export function Projects() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "kanban" | "list">("grid");
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  
  // Comments Drawer
  const [activeProjectForComments, setActiveProjectForComments] = useState<number | null>(null);
  const [comments, setComments] = useState<ProjectCommentData[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  
  // Create Project Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDomain, setNewDomain] = useState("AI/ML");
  const [newSupervisor, setNewSupervisor] = useState("Dr. Ahmed Hassan");
  const [newDept, setNewDept] = useState("Computer Science Dept.");
  const [newYear, setNewYear] = useState("2024/2025");
  const [newAbstract, setNewAbstract] = useState("");

  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDomain, setFilterDomain] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const loadProjects = async () => {
    try {
      setLoading(true);
      const res = await projectsApi.getAll();
      if (res && res.projects) {
        setProjects(res.projects);
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.warn("Failed to load projects:", err);
      toast.error("Could not load projects from server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
    const interval = setInterval(() => {
      loadProjects();
    }, 45000);
    return () => clearInterval(interval);
  }, []);

  // Load comments when activeProjectForComments changes
  useEffect(() => {
    if (activeProjectForComments !== null) {
      setLoadingComments(true);
      projectsApi.getComments(activeProjectForComments)
        .then(res => {
          if (res && res.comments) setComments(res.comments);
        })
        .catch(err => console.warn("Failed to load comments:", err))
        .finally(() => setLoadingComments(false));
    }
  }, [activeProjectForComments]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error("Project title is required");
      return;
    }

    try {
      await projectsApi.create({
        title: newTitle.trim(),
        domain: newDomain,
        supervisor: newSupervisor,
        dept: newDept,
        year: newYear,
        abstract: newAbstract.trim(),
        status: "Proposed",
      });

      toast.success(`Project "${newTitle}" created!`);
      setIsCreateModalOpen(false);
      setNewTitle("");
      setNewAbstract("");
      loadProjects();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create project");
    }
  };

  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData("projectId", id.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const id = parseInt(e.dataTransfer.getData("projectId"));
    if (isNaN(id)) return;

    setProjects(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    toast.success(`Project moved to ${newStatus}`);
    if (newStatus === "Completed") {
      setShowConfetti(true);
    }

    try {
      await projectsApi.updateStatus(id, newStatus);
    } catch (err) {
      console.warn("Failed to update status on server:", err);
    }
  };

  const handleAddComment = async () => {
    if (!activeProjectForComments || !commentText.trim()) return;
    try {
      const newComment = await projectsApi.addComment(activeProjectForComments, commentText.trim());
      setComments(prev => [...prev, newComment]);
      setCommentText("");
      toast.success("Comment posted");
    } catch (err: any) {
      toast.error(err?.message || "Failed to post comment");
    }
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm(`Delete ${selectedProjects.length} selected project(s)?`)) return;
    try {
      await Promise.all(selectedProjects.map(id => projectsApi.delete(id)));
      toast.success("Projects deleted");
      setProjects(prev => prev.filter(p => !selectedProjects.includes(p.id)));
      setSelectedProjects([]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete projects");
    }
  };

  const toggleSelection = (id: number) => {
    setSelectedProjects(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.supervisor || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.domain || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !filterStatus || p.status === filterStatus;
    const matchesDomain = !filterDomain || p.domain === filterDomain;
    return matchesSearch && matchesStatus && matchesDomain;
  });

  const exportToPDF = async () => {
    const element = document.getElementById('projects-container');
    if (!element) return;
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: document.documentElement.classList.contains('dark') ? '#0B0F19' : '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('projects-export.pdf');
    } catch (error) {
      console.error('Error generating PDF', error);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-48 rounded-2xl border border-glass-border" />)}
        </div>
      </div>
    );
  }

  return (
    <div id="projects-container" className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Search & Actions Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <div className="flex gap-4 w-full md:w-auto flex-wrap">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder={t('search_projects')} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field w-full pl-9"
            />
          </div>
          <Select 
            value={filterStatus}
            onChange={setFilterStatus}
            options={[
              { value: "", label: t('status') },
              { value: "Proposed", label: t('proposed') },
              { value: "Approved", label: t('approved') },
              { value: "In Progress", label: t('in_progress') },
              { value: "Completed", label: t('completed') },
            ]}
            className="w-32 z-30"
          />
          <Select 
            value={filterDomain}
            onChange={setFilterDomain}
            options={[
              { value: "", label: t('domain') },
              { value: "AI/ML", label: "AI/ML" },
              { value: "Cybersecurity", label: "Cybersecurity" },
              { value: "Web Dev", label: "Web Dev" },
              { value: "Data Science", label: "Data Science" },
              { value: "IoT", label: "IoT" },
            ]}
            className="w-32 z-30"
          />
        </div>
        
        <div className="flex items-center gap-4 self-start md:self-auto w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center bg-background/40 border border-glass-border rounded-lg p-1">
            <button 
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-accent text-text-main' : 'text-text-muted hover:text-text-main'}`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-accent text-text-main' : 'text-text-muted hover:text-text-main'}`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode("kanban")}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-accent text-text-main' : 'text-text-muted hover:text-text-main'}`}
              title="Kanban View"
            >
              <Kanban className="w-4 h-4" />
            </button>
          </div>
          <button 
            onClick={() => navigate('/plagiarism')}
            className="btn-primary whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            {t('new_project')}
          </button>
        </div>
      </div>
      
      <div className="flex justify-between items-center text-xs text-text-muted">
        <span>Showing {filteredProjects.length} of {projects.length} projects</span>
        <span>Last synced: {lastUpdated.toLocaleTimeString()}</span>
      </div>

      {viewMode === "grid" ? (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.1 }}
        >
          {filteredProjects.map((project, idx) => (
            <motion.div 
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`glass-card hover:border-accent/50 transition-colors group relative flex flex-col justify-between ${selectedProjects.includes(project.id) ? 'border-accent bg-accent-light' : ''}`}
            >
              <div>
                <div className="absolute top-4 right-4 z-10">
                  <input 
                    type="checkbox" 
                    checked={selectedProjects.includes(project.id)}
                    onChange={() => toggleSelection(project.id)}
                    className="w-4 h-4 rounded border-glass-border bg-text-muted/5 text-accent focus:ring-accent cursor-pointer"
                  />
                </div>

                <h3 className="text-xl font-bold text-text-main leading-tight mb-3 pr-8 group-hover:text-accent transition-colors">
                  {project.title}
                </h3>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-2 py-1 rounded-md bg-indigo-500/20 text-indigo-400 text-xs font-medium">
                    {project.domain}
                  </span>
                  <span className={`px-2 py-1 rounded-md text-xs font-medium border
                    ${project.status === 'In Progress' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : ''}
                    ${project.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : ''}
                    ${project.status === 'Proposed' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : ''}
                    ${project.status === 'Approved' ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : ''}
                  `}>
                    {project.status}
                  </span>
                </div>

                <div className="text-sm text-text-muted mb-6 space-y-1">
                  <p>{project.supervisor} • {project.dept}</p>
                  <p>{project.year}</p>
                  {project.abstract && (
                    <p className="text-xs text-text-muted/80 line-clamp-2 mt-2 pt-2 border-t border-glass-border">
                      {project.abstract}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-glass-border">
                <div className="flex -space-x-2">
                  {[1,2,3].map(i => (
                    <Avatar key={i} name={`Student ${i}`} className={`w-8 h-8 text-[10px] border-2 border-background z-${10-i}`} />
                  ))}
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setActiveProjectForComments(project.id)}
                    className="p-2 rounded-lg bg-text-muted/10 text-text-muted hover:bg-accent/10 hover:text-accent transition-colors border border-transparent hover:border-accent/20 flex items-center gap-2"
                    title="Comments"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-xs font-semibold">{project.comment_count || 0}</span>
                  </button>
                  <Link 
                    to={`/projects/${project.id}`}
                    className="text-sm font-medium text-accent hover:text-accent-hover flex items-center gap-1 group-hover:underline"
                  >
                    View Details <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      ) : viewMode === "list" ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-0 overflow-hidden"
        >
          <div className="overflow-x-auto pb-4">
            <table className="w-full text-sm text-left min-w-[1000px] table-fixed">
              <thead className="text-text-muted bg-background/50 border-b border-glass-border">
                <tr>
                  <th className="p-0 w-12 text-center">
                    <div className="px-4 py-4">#</div>
                  </th>
                  <th className="font-medium p-0">
                    <div className="px-6 py-4 resize-x overflow-hidden min-w-[250px]">Project Title</div>
                  </th>
                  <th className="font-medium p-0">
                    <div className="px-6 py-4 resize-x overflow-hidden min-w-[120px]">Domain</div>
                  </th>
                  <th className="font-medium p-0">
                    <div className="px-6 py-4 resize-x overflow-hidden min-w-[120px]">Status</div>
                  </th>
                  <th className="font-medium p-0">
                    <div className="px-6 py-4 resize-x overflow-hidden min-w-[150px]">Supervisor</div>
                  </th>
                  <th className="font-medium p-0">
                    <div className="px-6 py-4 resize-x overflow-hidden min-w-[150px]">Department</div>
                  </th>
                  <th className="font-medium p-0 w-[120px]">
                    <div className="px-6 py-4 text-right">Actions</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-border">
                {filteredProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-text-muted/5 transition-colors text-text-main group">
                    <td className="px-4 py-4 text-center">
                      <input 
                        type="checkbox" 
                        checked={selectedProjects.includes(project.id)}
                        onChange={() => toggleSelection(project.id)}
                        className="w-4 h-4 rounded border-glass-border bg-text-muted/5 text-accent focus:ring-accent cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 font-semibold">{project.title}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-md bg-indigo-500/20 text-indigo-400 text-xs font-medium">
                        {project.domain}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium border
                        ${project.status === 'In Progress' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : ''}
                        ${project.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : ''}
                        ${project.status === 'Proposed' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : ''}
                        ${project.status === 'Approved' ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : ''}
                      `}>
                        {project.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-text-muted">{project.supervisor}</td>
                    <td className="px-6 py-4 text-text-muted">{project.dept}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <button 
                          onClick={() => setActiveProjectForComments(project.id)}
                          className="p-1.5 rounded-md bg-text-muted/10 text-text-muted hover:bg-accent/10 hover:text-accent transition-colors border border-transparent hover:border-accent/20 flex items-center gap-1.5"
                          title="Comments"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-semibold">{project.comment_count || 0}</span>
                        </button>
                        <Link 
                          to={`/projects/${project.id}`}
                          className="p-1.5 rounded-md text-text-muted hover:text-accent transition-colors"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex gap-6 overflow-x-auto pb-4 items-start min-h-[60vh] relative"
        >
          <CollaborativeCursors />
          {COLUMNS.map(column => {
            const columnProjects = filteredProjects.filter(p => p.status === column);
            return (
              <div 
                key={column} 
                className="glass-panel border-none bg-text-muted/5 p-4 min-w-[320px] flex flex-col gap-3 rounded-xl h-full"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column)}
              >
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-semibold text-text-main uppercase tracking-wider">{column}</h4>
                  <span className="text-xs font-medium text-text-muted bg-text-muted/5 px-2 py-0.5 rounded-full">{columnProjects.length}</span>
                </div>
                
                <div className="flex flex-col gap-3 flex-1 min-h-[100px]">
                  {columnProjects.map(project => (
                    <div 
                      key={project.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, project.id)}
                      onClick={() => setActiveProjectForComments(project.id)}
                      className="glass-card p-4 cursor-grab active:cursor-grabbing hover:border-accent transition-colors bg-surface/80 shadow-lg"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-500/20 text-indigo-400">
                          {project.domain}
                        </span>
                        <button 
                          className="p-1.5 rounded-md bg-text-muted/10 text-text-muted hover:bg-accent/10 hover:text-accent transition-colors border border-transparent hover:border-accent/20 flex items-center gap-1.5" 
                          onClick={(e) => { e.stopPropagation(); setActiveProjectForComments(project.id); }}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-semibold">{project.comment_count || 0}</span>
                        </button>
                      </div>
                      <p className="text-sm text-text-main font-semibold leading-snug mb-3">{project.title}</p>
                      
                      <div className="flex justify-between items-center pt-3 border-t border-[rgba(255,255,255,0.05)]">
                        <span className="text-xs text-text-muted truncate max-w-[120px]">{project.supervisor}</span>
                        <div className="flex -space-x-1.5">
                          <Avatar name="Eng Khalid" className="w-6 h-6 text-[8px] border border-[#1e293b]" colorClass="from-emerald-500 to-teal-500" />
                          <Avatar name="Sarah Chen" className="w-6 h-6 text-[8px] border border-[#1e293b]" colorClass="from-orange-500 to-red-500" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button 
                  onClick={() => {
                    navigate('/plagiarism');
                  }}
                  className="text-text-muted hover:text-text-main text-sm flex items-center justify-center gap-1 py-2 hover:bg-text-muted/5 rounded-lg transition-colors mt-2"
                >
                  <Plus className="w-4 h-4" /> {t('add_project')}
                </button>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* COMMENTS DRAWER */}
      <AnimatePresence>
        {activeProjectForComments !== null && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveProjectForComments(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, x: "100%" }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-background border-l border-glass-border z-50 shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-glass-border">
                <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-accent" />
                  Project Discussion & Log
                </h3>
                <button
                  onClick={() => setActiveProjectForComments(null)}
                  className="text-text-muted hover:text-text-main transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingComments ? (
                  <div className="space-y-3">
                    <Skeleton className="h-16 rounded-xl" />
                    <Skeleton className="h-16 rounded-xl" />
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-12 text-text-muted text-sm">
                    No comments yet. Start the conversation below!
                  </div>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <Avatar name={c.author_name} className="w-8 h-8 text-[10px]" colorClass="from-indigo-500 to-purple-600" />
                      <div className="bg-surface/80 border border-glass-border rounded-2xl p-3 text-sm text-text-main flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-xs text-text-main">{c.author_name}</p>
                          <span className="text-[10px] text-text-muted">{c.created_at}</span>
                        </div>
                        <p className="text-xs text-text-muted leading-relaxed">{c.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 border-t border-glass-border">
                <div className="relative flex items-end">
                  <textarea 
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                    placeholder="Write a comment... (Enter to send)"
                    className="input-field w-full min-h-[80px] resize-none pr-12 text-xs"
                  ></textarea>
                  <button 
                    onClick={handleAddComment}
                    className="absolute right-2 bottom-2 p-2 bg-accent hover:bg-accent-hover text-text-main rounded-md transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* CREATE PROJECT MODAL */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
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
                  <BookOpen className="w-5 h-5 text-accent" />
                  Create New Research Project
                </h3>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-text-muted hover:text-text-main">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-text-main block mb-1">Project Title *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. NextGen Autonomous Drone Navigation"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="input-field w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text-main block mb-1">Domain</label>
                    <select 
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      className="input-field w-full"
                    >
                      <option value="AI/ML">AI/ML</option>
                      <option value="Cybersecurity">Cybersecurity</option>
                      <option value="Web Dev">Web Dev</option>
                      <option value="Data Science">Data Science</option>
                      <option value="IoT">IoT</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-main block mb-1">Academic Year</label>
                    <input 
                      type="text" 
                      value={newYear}
                      onChange={(e) => setNewYear(e.target.value)}
                      className="input-field w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text-main block mb-1">Supervisor</label>
                    <input 
                      type="text" 
                      value={newSupervisor}
                      onChange={(e) => setNewSupervisor(e.target.value)}
                      className="input-field w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-main block mb-1">Department</label>
                    <input 
                      type="text" 
                      value={newDept}
                      onChange={(e) => setNewDept(e.target.value)}
                      className="input-field w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-main block mb-1">Abstract & Scope</label>
                  <textarea 
                    placeholder="Describe research goals, technical architecture, and expected deliverables..."
                    value={newAbstract}
                    onChange={(e) => setNewAbstract(e.target.value)}
                    className="input-field w-full min-h-[70px]"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-glass-border">
                  <button 
                    type="button" 
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-sm text-text-muted hover:bg-surface transition-colors"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Create Project
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Selection Bar */}
      <AnimatePresence>
        {selectedProjects.length > 0 && viewMode === "grid" && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface/90 backdrop-blur-xl border border-glass-border rounded-full px-6 py-4 shadow-2xl flex items-center gap-6 z-40"
          >
            <div className="text-text-main font-medium">
              <span className="bg-accent text-text-main px-2 py-1 rounded-md text-sm mr-2">{selectedProjects.length}</span>
              selected
            </div>
            
            <div className="h-6 w-px bg-glass-border"></div>
            
            <div className="flex items-center gap-2">
              <button 
                className="p-2 text-text-muted hover:text-text-main hover:bg-text-muted/10 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                onClick={exportToPDF}
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export PDF</span>
              </button>
              
              <button 
                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                onClick={handleDeleteSelected}
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            </div>
            
            <button 
              onClick={() => setSelectedProjects([])}
              className="ml-2 p-1 text-text-muted hover:text-text-main hover:bg-text-muted/10 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {showConfetti && <Confetti onComplete={() => setShowConfetti(false)} />}
    </div>
  );
}
