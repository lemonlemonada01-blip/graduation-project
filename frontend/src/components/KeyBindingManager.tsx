import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Keyboard, X } from "lucide-react";

export function KeyBindingManager() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global Navigation
      if (e.altKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        navigate("/attendance");
      }
      if (e.altKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        navigate("/projects");
      }
      if (e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        navigate("/settings");
      }
      
      // Ctrl + / or Cmd + / to toggle help overlay
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      
      // Esc to exit this modal (and others might handle Esc themselves)
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  const shortcuts = [
    { keys: ["Ctrl", "K"], description: "Open Command Palette" },
    { keys: ["Ctrl", "N"], description: "New Meeting" },
    { keys: ["Alt", "A"], description: "Go to Attendance" },
    { keys: ["Alt", "P"], description: "Go to Projects" },
    { keys: ["Alt", "S"], description: "Go to Settings" },
    { keys: ["Ctrl", "/"], description: "Toggle Shortcuts Help" },
    { keys: ["Esc"], description: "Close Modals" },
  ];

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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md glass-panel shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-glass-border bg-text-muted/5">
              <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-accent" />
                Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-text-muted hover:text-text-main transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {shortcuts.map((sc, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-sm font-medium text-text-muted">{sc.description}</span>
                    <div className="flex gap-1.5">
                      {sc.keys.map((k, idx) => (
                        <span key={idx} className="bg-surface/80 border border-glass-border px-2 py-1 rounded-md text-xs font-bold text-text-main tracking-wider">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
