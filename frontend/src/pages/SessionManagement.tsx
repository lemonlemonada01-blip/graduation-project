import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Calendar, Plus, 
  MapPin, Users, Play, Edit, UserCog, Trash2,
  X, UploadCloud, ChevronDown, Check, Loader2, BookOpen, RefreshCw
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { sessionsApi, AcademicSessionData } from "../lib/api";

type SessionStatus = 'Upcoming' | 'Live Now' | 'Completed' | 'Cancelled';
type SessionType = 'Lecture' | 'Lab' | 'Defense Committee' | 'Exam';

export function SessionManagement() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<AcademicSessionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    code: "",
    type: "Lecture" as SessionType,
    location: "",
    date: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "11:00",
    gracePeriod: 15,
    status: "Upcoming" as SessionStatus,
  });

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      const res = await sessionsApi.getAll();
      if (res && res.sessions) {
        setSessions(res.sessions);
      }
    } catch (err: any) {
      console.error("Failed to load sessions:", err);
      toast.error(t("no_sessions_found"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Live Now': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Upcoming': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'Completed': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      case 'Cancelled': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Live Now': return t("live_now");
      case 'Upcoming': return t("upcoming");
      case 'Completed': return t("completed");
      case 'Cancelled': return t("cancelled");
      default: return status;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'Lecture': return t("lecture");
      case 'Lab': return t("lab");
      case 'Defense Committee': return t("defense_committee");
      case 'Exam': return t("exam");
      default: return type;
    }
  };

  const filteredSessions = sessions.filter(s => 
    (s.courseName || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.courseCode || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.room || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openCreateModal = () => {
    setEditingSessionId(null);
    setFormData({
      title: "",
      code: "",
      type: "Lecture",
      location: "",
      date: new Date().toISOString().split("T")[0],
      startTime: "09:00",
      endTime: "11:00",
      gracePeriod: 15,
      status: "Upcoming",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (s: AcademicSessionData) => {
    setEditingSessionId(s.id);
    const times = (s.timeRange || "09:00 - 11:00").split(" - ");
    setFormData({
      title: s.courseName,
      code: s.courseCode,
      type: s.type,
      location: s.room,
      date: s.date,
      startTime: times[0] || "09:00",
      endTime: times[1] || "11:00",
      gracePeriod: s.gracePeriod || 15,
      status: s.status,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.code.trim()) {
      toast.error(t("course_title") + " & " + t("course_code"));
      return;
    }

    setIsSaving(true);
    try {
      const timeRangeFormatted = `${formData.startTime} - ${formData.endTime}`;
      if (editingSessionId) {
        await sessionsApi.update(editingSessionId, {
          courseCode: formData.code,
          courseName: formData.title,
          type: formData.type,
          room: formData.location || "Auditorium",
          date: formData.date,
          timeRange: timeRangeFormatted,
          gracePeriod: formData.gracePeriod,
          status: formData.status,
        });
        toast.success(t("save_session"));
      } else {
        await sessionsApi.create({
          courseCode: formData.code,
          courseName: formData.title,
          type: formData.type,
          room: formData.location || "Auditorium",
          date: formData.date,
          timeRange: timeRangeFormatted,
          gracePeriod: formData.gracePeriod,
          status: formData.status,
          enrolled: 0,
        });
        toast.success(t("schedule_session"));
      }
      setIsModalOpen(false);
      fetchSessions();
    } catch (err: any) {
      toast.error(err.message || t("no_sessions_found"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("delete_session_confirm"))) return;
    try {
      await sessionsApi.delete(id);
      setSessions(prev => prev.filter(s => s.id !== id));
      toast.success(t("delete"));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete session");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-400" />
            {t("session_mgmt_title")}
          </h1>
          <p className="text-sm text-slate-400 mt-1">{t("session_mgmt_desc")}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rtl:right-3 rtl:left-auto" />
            <input 
              type="text"
              placeholder={t("search_sessions")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-800/50 border border-slate-700 rounded-lg pl-9 pr-4 rtl:pr-9 rtl:pl-4 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <button 
            onClick={fetchSessions}
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
            title={t("refresh_sessions")}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={openCreateModal}
            className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            {t("schedule_session")}
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      )}

      {/* Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredSessions.map(session => (
              <motion.div 
                key={session.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#1e293b]/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden flex flex-col hover:border-slate-600 transition-colors"
              >
                <div className="p-5 flex flex-col flex-1 border-b border-slate-700/30 gap-4">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold tracking-wider text-indigo-400 uppercase">{session.courseCode}</span>
                      <h3 className="font-semibold text-slate-200 mt-0.5 line-clamp-1">{session.courseName}</h3>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border tracking-wide uppercase whitespace-nowrap ${getStatusColor(session.status)}`}>
                      {getStatusLabel(session.status)}
                    </span>
                  </div>

                  <div className="space-y-2.5 mt-2">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <BookOpen className="w-4 h-4 shrink-0 text-indigo-400" />
                      <span>{getTypeLabel(session.type)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Calendar className="w-4 h-4 shrink-0 text-slate-400" />
                      <span>{session.date} • {session.timeRange}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <MapPin className="w-4 h-4 shrink-0 text-slate-400" />
                      <span>{session.room}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Users className="w-4 h-4 shrink-0 text-slate-400" />
                      <span>{session.enrolled} {t("enrolled_students")}</span>
                      <span className="ml-auto rtl:mr-auto rtl:ml-0 text-xs text-slate-500">{session.gracePeriod} {t("grace_mins")}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-3 bg-slate-900/30 grid grid-cols-4 gap-2">
                  <button 
                    onClick={() => navigate(`/attendance?session=${session.id}`)}
                    disabled={session.status === 'Completed' || session.status === 'Cancelled'}
                    className="col-span-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-emerald-500/20"
                  >
                    <Play className="w-3.5 h-3.5 rtl:rotate-180" />
                    {t("launch_kiosk")}
                  </button>
                  <button 
                    onClick={() => openEditModal(session)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg flex items-center justify-center transition-colors border border-slate-700" 
                    title={t("edit")}
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => handleDelete(session.id)}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2 rounded-lg flex items-center justify-center transition-colors border border-red-500/20" 
                    title={t("delete")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredSessions.length === 0 && (
        <div className="text-center py-16 bg-[#1e293b]/40 rounded-2xl border border-slate-800 p-8">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">{t("no_sessions_found")}</p>
        </div>
      )}

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-[#1e293b] border border-slate-700 shadow-2xl rounded-2xl z-[101] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-700 bg-slate-900/40">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-400" />
                  {editingSessionId ? t("edit_session") : t("schedule_session")}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">{t("course_code")}</label>
                    <input 
                      type="text" 
                      placeholder="e.g. CS401" 
                      value={formData.code}
                      onChange={(e) => setFormData({...formData, code: e.target.value})}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" 
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">{t("course_title")}</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Senior Project Defense" 
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">{t("session_type")}</label>
                    <div className="relative">
                      <select 
                        value={formData.type}
                        onChange={(e) => setFormData({...formData, type: e.target.value as SessionType})}
                        className="w-full appearance-none bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="Lecture">{t("lecture")}</option>
                        <option value="Lab">{t("lab")}</option>
                        <option value="Defense Committee">{t("defense_committee")}</option>
                        <option value="Exam">{t("exam")}</option>
                      </select>
                      <ChevronDown className="absolute right-3 rtl:left-3 rtl:right-auto top-[11px] w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">{t("location_room")}</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Hall 3B" 
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">{t("session_date")}</label>
                    <input 
                      type="date" 
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 [color-scheme:dark]" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">{t("start_time")}</label>
                    <input 
                      type="time" 
                      value={formData.startTime}
                      onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 [color-scheme:dark]" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">{t("end_time")}</label>
                    <input 
                      type="time" 
                      value={formData.endTime}
                      onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 [color-scheme:dark]" 
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>{t("grace_period_mins")}</span>
                    <span className="text-indigo-400">{formData.gracePeriod} min</span>
                  </label>
                  <input 
                    type="range" 
                    min="0" max="60" step="5"
                    value={formData.gracePeriod}
                    onChange={(e) => setFormData({...formData, gracePeriod: parseInt(e.target.value)})}
                    className="w-full accent-indigo-500" 
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                    <span>0m</span>
                    <span>15m</span>
                    <span>30m</span>
                    <span>60m</span>
                  </div>
                </div>

                {/* Roster management will be added when backend support is available */}

              </div>

              <div className="p-5 border-t border-slate-700 bg-slate-900/40 flex justify-end gap-3">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  {t("cancel")}
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-indigo-500 hover:bg-indigo-600 text-white flex items-center gap-2 transition-colors disabled:opacity-70 shadow-lg shadow-indigo-500/20"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {isSaving ? t("saving") : t("save_session")}
                </button>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
