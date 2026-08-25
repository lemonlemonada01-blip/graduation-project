import re

with open("D:/AI engine/frontend/src/pages/Attendance.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add imports for Plus, Edit, Trash2 if not there
if "Plus" not in content:
    content = content.replace("Eye, Zap,", "Eye, Zap, Plus, Edit, Trash2,")
    
# Add create/edit/delete logic
manage_logic = """
  const handleCreateSession = async () => {
    try {
      const res = await sessionsApi.create(sessionFormData);
      setAvailableSessions([...availableSessions, res.session]);
      setSelectedSessionId(res.session.id);
      setShowSessionModal(false);
      toast.success("Session created successfully");
    } catch (e) {
      toast.error("Failed to create session");
    }
  };

  const handleDeleteSession = async () => {
    if (!selectedSessionId || !window.confirm("Delete this session?")) return;
    try {
      await sessionsApi.delete(selectedSessionId);
      const newSessions = availableSessions.filter(s => s.id !== selectedSessionId);
      setAvailableSessions(newSessions);
      if (newSessions.length > 0) {
        setSelectedSessionId(newSessions[0].id);
      } else {
        setSelectedSessionId("");
      }
      toast.success("Session deleted");
    } catch (e) {
      toast.error("Failed to delete session");
    }
  };

  const getPromptMessage"""

content = content.replace("  const getPromptMessage", manage_logic)

# UI for the dropdown area
dropdown_old = """            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1 block">{t("active_session")}</label>
                <div className="relative">
                  <select 
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                    className="w-full appearance-none bg-slate-800/50 text-white font-medium px-4 py-2.5 rounded-xl border border-white/5 focus:outline-none focus:border-indigo-500/50 truncate pr-10 rtl:pl-10 rtl:pr-4 cursor-pointer"
                  >
                    {availableSessions.length === 0 ? (
                      <option value="">{t("no_sessions_found")}</option>
                    ) : (
                      availableSessions.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.courseCode}: {s.courseName} — {s.room} ({s.status})
                        </option>
                      ))
                    )}
                  </select>
                  <ChevronDown className="absolute right-3 rtl:left-3 rtl:right-auto top-[11px] w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>"""

dropdown_new = """            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase">{t("active_session")}</label>
                  <div className="flex gap-2">
                    <button onClick={() => setShowSessionModal(true)} className="text-indigo-400 hover:text-indigo-300 transition-colors"><Plus className="w-4 h-4" /></button>
                    {selectedSessionId && (
                      <button onClick={handleDeleteSession} className="text-red-400 hover:text-red-300 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <select 
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                    className="w-full appearance-none bg-slate-800/50 text-white font-medium px-4 py-2.5 rounded-xl border border-white/5 focus:outline-none focus:border-indigo-500/50 truncate pr-10 rtl:pl-10 rtl:pr-4 cursor-pointer"
                  >
                    {availableSessions.length === 0 ? (
                      <option value="">{t("no_sessions_found")}</option>
                    ) : (
                      availableSessions.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.courseCode}: {s.courseName} — {s.room} ({s.status})
                        </option>
                      ))
                    )}
                  </select>
                  <ChevronDown className="absolute right-3 rtl:left-3 rtl:right-auto top-[11px] w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>"""

content = content.replace(dropdown_old, dropdown_new)

# Add Session Modal UI
modal_ui = """      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(30, 41, 59, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.2);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.4);
        }
      `}</style>
      
      {/* Create Session Modal */}
      <AnimatePresence>
        {showSessionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <h2 className="text-xl font-bold text-white mb-4">Create New Session</h2>
              <div className="flex flex-col gap-3">
                <input placeholder="Course Code (e.g. CS101)" value={sessionFormData.courseCode} onChange={e => setSessionFormData({...sessionFormData, courseCode: e.target.value})} className="bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white" />
                <input placeholder="Course Name" value={sessionFormData.courseName} onChange={e => setSessionFormData({...sessionFormData, courseName: e.target.value})} className="bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white" />
                <input placeholder="Room" value={sessionFormData.room} onChange={e => setSessionFormData({...sessionFormData, room: e.target.value})} className="bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white" />
                <input placeholder="Date (e.g. 2024-04-10)" value={sessionFormData.date} onChange={e => setSessionFormData({...sessionFormData, date: e.target.value})} className="bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white" />
                <input placeholder="Time Range (e.g. 09:00 AM - 12:00 PM)" value={sessionFormData.timeRange} onChange={e => setSessionFormData({...sessionFormData, timeRange: e.target.value})} className="bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white" />
                
                <div className="flex gap-3 justify-end mt-4">
                  <button onClick={() => setShowSessionModal(false)} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors">Cancel</button>
                  <button onClick={handleCreateSession} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors">Create Session</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
"""

content = content.replace("      <style>{`\n        .custom-scrollbar::-webkit-scrollbar {\n          width: 6px;\n          height: 6px;\n        }\n        .custom-scrollbar::-webkit-scrollbar-track {\n          background: rgba(30, 41, 59, 0.5);\n          border-radius: 4px;\n        }\n        .custom-scrollbar::-webkit-scrollbar-thumb {\n          background: rgba(148, 163, 184, 0.2);\n          border-radius: 4px;\n        }\n        .custom-scrollbar::-webkit-scrollbar-thumb:hover {\n          background: rgba(148, 163, 184, 0.4);\n        }\n      `}</style>", modal_ui)


with open("D:/AI engine/frontend/src/pages/Attendance.tsx", "w", encoding="utf-8") as f:
    f.write(content)
