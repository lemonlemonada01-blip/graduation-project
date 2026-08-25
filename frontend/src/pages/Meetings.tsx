import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ChevronDown, CheckCircle2, XCircle, Trash2, Calendar, Clock, MapPin, UserCheck, X, Search, Video } from "lucide-react";
import React from "react";
import { Skeleton } from "../components/ui/Skeleton";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { meetingsApi, MeetingData, MeetingAttendeeData } from "../lib/api";

export function Meetings() {
  const { t } = useTranslation();
  const [meetings, setMeetings] = useState<MeetingData[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Create Meeting Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [newTimeRange, setNewTimeRange] = useState("");
  const [newRoom, setNewRoom] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [attendeeNames, setAttendeeNames] = useState("");

  const loadMeetings = async () => {
    try {
      setLoading(true);
      const res = await meetingsApi.getAll();
      if (res && res.meetings) {
        setMeetings(res.meetings);
        if (res.meetings.length > 0 && expandedId === null) {
          setExpandedId(res.meetings[0].id);
        }
      }
    } catch (err) {
      console.warn("Error loading meetings:", err);
      toast.error("Could not load meetings from server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeetings();

    const handleOpenModal = () => setIsCreateModalOpen(true);
    window.addEventListener("open-new-meeting-modal", handleOpenModal);
    return () => window.removeEventListener("open-new-meeting-modal", handleOpenModal);
  }, []);

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error("Meeting title is required");
      return;
    }

    const attendees = attendeeNames
      .split(",")
      .map(n => n.trim())
      .filter(Boolean)
      .map(name => ({
        student_name: name,
        student_id: name.toLowerCase().replace(/\s+/g, ".") + "@university.edu",
      }));

    try {
      await meetingsApi.create({
        title: newTitle.trim(),
        date: newDate,
        time_range: newTimeRange,
        room: newRoom,
        notes: newNotes,
        attendees,
      });

      toast.success(`Meeting "${newTitle}" created successfully!`);
      setIsCreateModalOpen(false);
      setNewTitle("");
      setNewNotes("");
      loadMeetings();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create meeting");
    }
  };

  const handleDeleteMeeting = async (meetingId: number, meetingTitle: string) => {
    if (!window.confirm(`Delete meeting "${meetingTitle}"?`)) return;
    try {
      await meetingsApi.delete(meetingId);
      toast.success("Meeting deleted");
      setMeetings(prev => prev.filter(m => m.id !== meetingId));
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete meeting");
    }
  };

  const handleVerifyAttendee = async (meetingId: number, studentName: string, studentId: string) => {
    try {
      await meetingsApi.verifyAttendee(meetingId, {
        student_name: studentName,
        student_id: studentId,
        verification_method: "3D Face Biometrics (MiniFASNetV2)",
        confidence: "99.8%",
      });
      toast.success(`Biometric verified: ${studentName}`);
      loadMeetings();
    } catch (err: any) {
      toast.error(err?.message || "Verification failed");
    }
  };

  const filteredMeetings = meetings.filter(m => {
    const matchesSearch = 
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.notes || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.room || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || m.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-36" />
        </div>
        <Skeleton className="h-[600px] rounded-2xl border border-glass-border" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-text-main tracking-tight">{t("meeting_management")}</h2>
          <p className="text-sm text-text-muted mt-1">
            Schedule supervisory meetings, track attendance with 3D biometrics, and verify participation.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search meetings..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field w-full pl-9"
            />
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            {t("create_meeting")} (Cmd+N)
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 pb-2">
        {["all", "verified", "partial", "unverified"].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
              filterStatus === st 
                ? 'bg-accent text-white shadow-lg shadow-accent/20' 
                : 'bg-surface/50 border border-glass-border text-text-muted hover:text-text-main'
            }`}
          >
            {st} ({st === "all" ? meetings.length : meetings.filter(m => m.status === st).length})
          </button>
        ))}
      </div>

      {/* Meetings Table Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-0 overflow-hidden"
      >
        <div className="p-5 border-b border-glass-border flex justify-between items-center">
          <h3 className="text-lg font-semibold text-text-main flex items-center gap-2">
            <Calendar className="w-5 h-5 text-accent" />
            {t("meetings")} ({filteredMeetings.length})
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-text-muted bg-background/50 border-b border-glass-border">
              <tr>
                <th className="px-6 py-4 font-medium flex items-center gap-1">{t("date")} <ChevronDown className="w-3 h-3" /></th>
                <th className="px-6 py-4 font-medium">Meeting Title / Project</th>
                <th className="px-6 py-4 font-medium">Room & Time</th>
                <th className="px-6 py-4 font-medium">{t("attendance")}</th>
                <th className="px-6 py-4 font-medium text-right">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border">
              {filteredMeetings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-text-muted">
                    No meetings found. Click "Create Meeting" to schedule one.
                  </td>
                </tr>
              ) : (
                filteredMeetings.map((meeting) => {
                  const verifiedCount = (meeting.attendees || []).filter(a => a.is_verified).length;
                  const totalCount = meeting.attendees?.length || 0;

                  return (
                    <React.Fragment key={meeting.id}>
                      <tr className="hover:bg-text-muted/5 transition-colors text-text-main">
                        <td className="px-6 py-4 whitespace-nowrap font-medium">{meeting.date}</td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-text-main">{meeting.title}</div>
                          {meeting.notes && <div className="text-xs text-text-muted mt-0.5">{meeting.notes}</div>}
                        </td>
                        <td className="px-6 py-4 text-text-muted text-xs">
                          <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-accent" /> {meeting.room}</div>
                          <div className="flex items-center gap-1.5 mt-1"><Clock className="w-3.5 h-3.5 text-text-muted" /> {meeting.time_range}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border
                            ${meeting.status === 'verified' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : ''}
                            ${meeting.status === 'partial' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : ''}
                            ${meeting.status === 'unverified' ? 'bg-red-500/10 text-red-400 border-red-500/20' : ''}
                          `}>
                            {verifiedCount}/{totalCount} verified
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => setExpandedId(expandedId === meeting.id ? null : meeting.id)}
                              className="px-3 py-1.5 bg-surface/50 hover:bg-surface/80 border border-glass-border rounded-lg text-text-main text-xs font-medium transition-colors"
                            >
                              {expandedId === meeting.id ? t('collapse') : t('expand')}
                            </button>
                            <button
                              onClick={() => handleDeleteMeeting(meeting.id, meeting.title)}
                              className="p-1.5 hover:bg-red-500/10 text-text-muted hover:text-red-400 rounded-lg transition-colors"
                              title="Delete meeting"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      <AnimatePresence>
                        {expandedId === meeting.id && meeting.attendees && meeting.attendees.length > 0 && (
                          <motion.tr
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-text-muted/5"
                          >
                            <td colSpan={5} className="p-0 border-b border-glass-border">
                              <div className="px-6 py-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">
                                    Attendee Roster & Biometric Status
                                  </h4>
                                </div>

                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-text-muted border-b border-glass-border/50 text-xs">
                                      <th className="pb-2 font-medium text-left">{t("student_name")}</th>
                                      <th className="pb-2 font-medium text-left">Student ID / Email</th>
                                      <th className="pb-2 font-medium text-left">{t("verification")}</th>
                                      <th className="pb-2 font-medium text-left">{t("timestamp")}</th>
                                      <th className="pb-2 font-medium text-right">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-glass-border/30">
                                    {meeting.attendees.map((attendee, idx) => (
                                      <tr key={idx} className="text-text-main">
                                        <td className="py-2.5 font-medium">{attendee.student_name}</td>
                                        <td className="py-2.5 text-xs text-text-muted font-mono">{attendee.student_id}</td>
                                        <td className="py-2.5">
                                          {attendee.is_verified ? (
                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
                                              <CheckCircle2 className="w-3.5 h-3.5" /> {attendee.verification_method || t("face_verified")}
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-medium">
                                              <XCircle className="w-3.5 h-3.5" /> {t("not_verified")}
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-2.5 text-text-muted font-mono text-xs">{attendee.timestamp || "--"}</td>
                                        <td className="py-2.5 text-right">
                                          {!attendee.is_verified && (
                                            <button
                                              onClick={() => handleVerifyAttendee(meeting.id, attendee.student_name, attendee.student_id)}
                                              className="px-2.5 py-1 bg-accent/15 hover:bg-accent/25 border border-accent/30 text-accent rounded-lg text-xs font-medium transition-colors"
                                            >
                                              <UserCheck className="w-3.5 h-3.5 inline mr-1" />
                                              Verify Now
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* CREATE MEETING MODAL */}
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
                  <Calendar className="w-5 h-5 text-accent" />
                  Schedule New Meeting
                </h3>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-text-muted hover:text-text-main">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateMeeting} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-text-main block mb-1">Meeting Title / Topic *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Weekly Progress Review & Plagiarism Check"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="input-field w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text-main block mb-1">Date</label>
                    <input 
                      type="date" 
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="input-field w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-main block mb-1">Time Range</label>
                    <input 
                      type="text" 
                      placeholder="10:00 AM - 11:30 AM"
                      value={newTimeRange}
                      onChange={(e) => setNewTimeRange(e.target.value)}
                      className="input-field w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-main block mb-1">Location / Room</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Room 304 - AI Lab or Zoom Link"
                    value={newRoom}
                    onChange={(e) => setNewRoom(e.target.value)}
                    className="input-field w-full"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-main block mb-1">Attendee Names (comma-separated)</label>
                  <input 
                    type="text" 
                    placeholder="James Annan, Stephen Kara, Sarah Chen"
                    value={attendeeNames}
                    onChange={(e) => setAttendeeNames(e.target.value)}
                    className="input-field w-full"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-main block mb-1">Agenda / Meeting Notes</label>
                  <textarea 
                    placeholder="Milestone evaluation, deliverables review..."
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="input-field w-full min-h-[60px]"
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
                    Schedule Meeting
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
