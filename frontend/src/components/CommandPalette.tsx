import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Search, LayoutDashboard, FolderKanban, Users, Calendar, Plus, FileText, Settings } from "lucide-react";

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    const onOpen = () => setIsOpen(true);
    window.addEventListener('open-command-palette', onOpen);
    return () => window.removeEventListener('open-command-palette', onOpen);
  }, []);

  const actions = [
    { id: "dashboard", title: "Go to Dashboard", icon: LayoutDashboard, action: () => navigate("/") },
    { id: "projects", title: "Go to Projects", icon: FolderKanban, action: () => navigate("/projects") },
    { id: "teams", title: "Go to Teams", icon: Users, action: () => navigate("/teams") },
    { id: "meetings", title: "Go to Meetings", icon: Calendar, action: () => navigate("/meetings") },
    { id: "reports", title: "Go to Reports", icon: FileText, action: () => navigate("/reports") },
    { id: "settings", title: "Go to Settings", icon: Settings, action: () => navigate("/settings") },
    { id: "new-meeting", title: "Create new Meeting", icon: Plus, action: () => navigate("/meetings") },
    { id: "new-project", title: "Create new Project", icon: Plus, action: () => navigate("/projects") },
    { id: "search-1", title: "Project: AI Attendance", icon: Search, action: () => navigate("/projects/1") },
    { id: "search-2", title: "Team Member: Sarah Chen", icon: Search, action: () => navigate("/teams") },
  ];

  const filteredActions = query 
    ? actions.filter(a => a.title.toLowerCase().includes(query.toLowerCase()))
    : actions;

  const onSelect = (action: () => void) => {
    action();
    setIsOpen(false);
    setQuery("");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg glass-panel shadow-2xl z-[60] overflow-hidden flex flex-col max-h-[60vh]"
          >
            <div className="flex items-center px-4 py-3 border-b border-glass-border">
              <Search className="w-5 h-5 text-text-muted mr-3" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command or search..."
                className="flex-1 bg-transparent border-none text-text-main focus:outline-none placeholder-text-muted text-base"
              />
              <div className="text-[10px] font-medium text-text-muted border border-glass-border px-1.5 py-0.5 rounded bg-text-muted/5">
                ESC
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {filteredActions.length === 0 ? (
                <div className="py-6 text-center text-text-muted text-sm">
                  No results found.
                </div>
              ) : (
                filteredActions.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onSelect(item.action)}
                    className="w-full flex items-center px-3 py-2.5 rounded-lg text-sm text-text-muted hover:text-text-main hover:bg-text-muted/10 transition-colors text-left"
                  >
                    <item.icon className="w-4 h-4 mr-3" />
                    {item.title}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
