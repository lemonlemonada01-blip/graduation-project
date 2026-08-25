import { ShieldCheck, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export function NotFound() {
  return (
    <div className="flex items-center justify-center h-screen w-screen bg-background relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center z-10 flex flex-col items-center"
      >
        <div className="relative flex justify-center items-center mb-8">
          <ShieldCheck className="w-64 h-64 text-[#1e293b] absolute opacity-50 stroke-[1]" />
          <h1 className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[#818cf8] to-[#4f46e5] relative z-10 tracking-tighter shadow-sm">
            404
          </h1>
        </div>
        
        <h2 className="text-3xl font-bold text-text-main mb-4">Page Not Found</h2>
        <p className="text-text-muted mb-10 text-lg max-w-md">
          The page you are looking for does not exist or has been moved.
        </p>
        
        <Link 
          to="/" 
          className="btn-primary rounded-full px-8 py-3 text-sm font-semibold tracking-wide"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>
      </motion.div>
    </div>
  );
}
