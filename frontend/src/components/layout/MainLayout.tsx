import { Outlet, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { Toaster } from "react-hot-toast";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { CommandPalette } from "../CommandPalette";
import { KeyBindingManager } from "../KeyBindingManager";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Clock, MapPin } from "lucide-react";
import { Select } from "../ui/Select";


export function MainLayout() {
  const navigate = useNavigate();
  const [isNewMeetingModalOpen, setIsNewMeetingModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState("AI-Powered Attendance System");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S or Cmd+S for Search (Command Palette)
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("open-command-palette"));
      }
      // Ctrl+N or Cmd+N for New Meeting Modal
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        setIsNewMeetingModalOpen(true);
      }
    };
    
    const handleOpenMeetingModal = () => setIsNewMeetingModalOpen(true);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-new-meeting-modal", handleOpenMeetingModal);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-new-meeting-modal", handleOpenMeetingModal);
    };
  }, []);

  return (
    <div className="flex h-full w-full bg-background overflow-hidden">
      <Toaster 
        position="bottom-right" 
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#fff',
            border: '1px solid #334155'
          }
        }} 
      />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-surface/30 via-background to-background">
        <Topbar />
        <main className="flex-1 overflow-auto p-8 relative">
          <Outlet />
        </main>
      </div>

      <CommandPalette />
      <KeyBindingManager />

      <AnimatePresence>
        {isNewMeetingModalOpen && createPortal(
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewMeetingModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md glass-panel shadow-2xl z-[101] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-glass-border bg-black/5 dark:bg-text-muted/5">
                <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-accent" />
                  New Meeting
                </h3>
                <button
                  onClick={() => setIsNewMeetingModalOpen(false)}
                  className="text-text-muted hover:text-text-main transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs text-text-muted font-medium mb-1.5 block">Project</label>
                  <Select 
                    value={selectedProject}
                    onChange={setSelectedProject}
                    options={[
                      { value: "AI-Powered Attendance System", label: "AI-Powered Attendance System" },
                      { value: "Cybersecurity Audit Tool", label: "Cybersecurity Audit Tool" }
                    ]}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-text-muted font-medium mb-1.5 flex items-center gap-1"><Calendar className="w-3 h-3"/> Date</label>
                    <input type="date" className="input-field w-full" />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted font-medium mb-1.5 flex items-center gap-1"><Clock className="w-3 h-3"/> Time</label>
                    <input type="time" className="input-field w-full" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-text-muted font-medium mb-1.5 flex items-center gap-1"><MapPin className="w-3 h-3"/> Location / Link</label>
                  <input type="text" placeholder="Room 101 or Zoom Link" className="input-field w-full" />
                </div>
                <div>
                  <label className="text-xs text-text-muted font-medium mb-1.5 block">Notes / Agenda</label>
                  <textarea rows={3} placeholder="Meeting agenda..." className="input-field w-full resize-none"></textarea>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setIsNewMeetingModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-text-muted hover:text-text-main hover:bg-text-muted/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setIsNewMeetingModalOpen(false);
                      navigate('/meetings');
                    }}
                    className="btn-primary"
                  >
                    Schedule Meeting
                  </button>
                </div>
              </div>
            </motion.div>
          </>,
          document.body
        )}
      </AnimatePresence>
    </div>
  );
}
