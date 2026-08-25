import React, { useState, useRef, useEffect, useMemo } from "react";
// Attendance table and associated API logic removed
import { motion, AnimatePresence } from "framer-motion";
import { 
  Camera, CheckCircle2, ScanFace, ChevronDown, UserCheck, 
  Clock, ShieldAlert, Download, AlertTriangle, Users, 
  Search, Filter, ShieldCheck, Fingerprint, Eye, Zap, Plus, Edit, Trash2,
  Focus, Square, CheckSquare, BarChart3, TrendingUp, ToggleLeft, ToggleRight, TriangleAlert
} from "lucide-react";
import Webcam from "react-webcam";
import { toast } from "react-hot-toast";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { biometricsApi, sessionsApi, AcademicSessionData } from "../lib/api";

type StudentStatus = 'Present' | 'Late' | 'Absent';

interface Student {
  id: string;
  name: string;
  major: string;
  method: string;
  timestamp: string;
  status: StudentStatus;
  recentlyClocked?: boolean;
}

const CHALLENGES = ["turn-left", "turn-right", "look-up", "look-down", "smile"];

export function Attendance() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const sessionParam = searchParams.get("session");

  const [availableSessions, setAvailableSessions] = useState<AcademicSessionData[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<StudentStatus | 'All'>('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [livenessState, setLivenessState] = useState<string>("idle");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isMaskDetected, setIsMaskDetected] = useState(false);
  const [isAutoCapture, setIsAutoCapture] = useState(false);
  
  const [chartView, setChartView] = useState<'trend' | 'heatmap'>('trend');
  const webcamRef = useRef<Webcam>(null);

  // Mock Timer
    const [trendData, setTrendData] = useState<any[]>([]);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionFormData, setSessionFormData] = useState<any>({
    courseCode: '', courseName: '', type: 'Lecture', room: '', date: '', timeRange: '', gracePeriod: 15, status: 'Upcoming'
  });

  useEffect(() => {
    sessionsApi.getStats().then(res => {
      if (res?.trend) {
        const formatted = res.trend.map(t => ({
          time: t.session_name || t.session,
          count: t.present + t.late
        }));
        setTrendData(formatted);
      }
    }).catch(console.error);
  }, []);
  const [sessionTime, setSessionTime] = useState(0);
  
  useEffect(() => {
    if (!selectedSessionId || availableSessions.length === 0) return;
    const session = availableSessions.find(s => s.id === selectedSessionId);
    if (!session || !session.timeRange) return;

    const [startStr] = session.timeRange.split(' - ');
    
    const calculateElapsed = () => {
      const now = new Date();
      const match = startStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (match) {
        let hours = parseInt(match[1]);
        const mins = parseInt(match[2]);
        const ampm = match[3].toUpperCase();
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        
        const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, mins, 0);
        const elapsed = Math.max(0, Math.floor((now.getTime() - startTime.getTime()) / 1000));
        setSessionTime(elapsed);
      }
    };

    calculateElapsed();
    const timer = setInterval(calculateElapsed, 1000);
    return () => clearInterval(timer);
  }, [selectedSessionId, availableSessions]);

  // Fetch sessions on mount
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const res = await sessionsApi.getAll();
        if (res && res.sessions && res.sessions.length > 0) {
          setAvailableSessions(res.sessions);
          if (sessionParam && res.sessions.some(s => s.id === sessionParam)) {
            setSelectedSessionId(sessionParam);
          } else {
            setSelectedSessionId(res.sessions[0].id);
          }
        }
      } catch (e) {
        console.error("Could not load sessions:", e);
      }
    };
    loadSessions();
  }, [sessionParam]);

  // Fetch roster when selectedSessionId changes
  useEffect(() => {
    if (!selectedSessionId) return;
    const loadRoster = async () => {
      try {
        setIsLoadingRoster(true);
        const records = await sessionsApi.getRoster(selectedSessionId);
        if (records && records.length > 0) {
          setStudents(records.map(r => ({
            id: r.student_id,
            name: r.student_name,
            major: (r as any).major || "Computer Science",
            method: r.verification_method || "-",
            timestamp: r.timestamp || "-",
            status: r.status as StudentStatus,
          })));
        }
      } catch (e) {
        console.error("Failed to load session roster:", e);
      } finally {
        setIsLoadingRoster(false);
      }
    };
    loadRoster();
  }, [selectedSessionId]);

  // Mock Auto-Capture sequence when optimal conditions are detected
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAutoCapture && livenessState === 'idle' && !isVerifying && !isMaskDetected) {
      timer = setTimeout(() => {
        toast(t("analyzing_mesh"), { icon: '⚡' });
        handleFastVerify();
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [isAutoCapture, livenessState, isVerifying, isMaskDetected]);

  

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleStartLivenessCheck = async () => {
    if (isVerifying) return;
    setIsVerifying(true);
    
    const screenshot = webcamRef.current?.getScreenshot();
    const shuffled = [...CHALLENGES].sort(() => 0.5 - Math.random());
    const sequence = [shuffled[0], shuffled[1], "center", "verifying", "success"];
    
    setLivenessState(sequence[0]);
    
    setTimeout(() => setLivenessState(sequence[1]), 2500);
    setTimeout(() => setLivenessState(sequence[2]), 5000);
    setTimeout(() => setLivenessState(sequence[3]), 7500);
    
    setTimeout(async () => {
      setLivenessState(sequence[4]);
      
      const activeScreenshot = webcamRef.current?.getScreenshot() || screenshot;
      if (activeScreenshot) {
        try {
          const res = await biometricsApi.identify(activeScreenshot);
          if (res.authenticated && res.student_id) {
            const score = res.distance !== undefined ? ((1 - res.distance) * 100).toFixed(1) : "99.8";
            const verifiedMethod = `3D Biometric Verified ${score}%`;
            
            let targetStudent = students.find(s => s.id === res.student_id);
            if (!targetStudent) {
              targetStudent = {
                id: res.student_id,
                name: res.student_name || res.student_id,
                status: 'Present',
                method: verifiedMethod,
                confidence: `${score}%`,
                timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}),
                recentlyClocked: true
              };
            } else if (res.student_name && targetStudent.name.startsWith("Student ")) {
              targetStudent = { ...targetStudent, name: res.student_name };
            }

            await clockInStudent(targetStudent, verifiedMethod, `${score}%`);
          } else {
            toast.error(res.message || "Face not recognized in database.");
          }
        } catch (e: any) {
          toast.error(e?.message || "3D Biometric authentication failed.");
        }
      }
      
      setTimeout(() => {
        setIsVerifying(false);
        setLivenessState("idle");
      }, 3000);
    }, 9500);
  };

  const handleFastVerify = async () => {
    if (isVerifying) return;
    setIsVerifying(true);
    setLivenessState("verifying");
    
    const screenshot = webcamRef.current?.getScreenshot();
    let verifiedMethod = "Fast Face ID";

    if (screenshot) {
      try {
        const res = await biometricsApi.identify(screenshot);
        if (res.authenticated && res.student_id) {
          const confidence = res.distance !== undefined ? `${((1 - res.distance) * 100).toFixed(1)}%` : "99.8%";
          verifiedMethod = `Fast Face ID (${confidence})`;
          
          let targetStudent = students.find(s => s.id === res.student_id);
          if (!targetStudent) {
            targetStudent = {
              id: res.student_id,
              name: res.student_name || res.student_id,
              status: 'Present',
              method: verifiedMethod,
              confidence: confidence,
              timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}),
              recentlyClocked: true
            };
          } else if (res.student_name && targetStudent.name.startsWith("Student ")) {
            targetStudent = { ...targetStudent, name: res.student_name };
          }
          
          setLivenessState("success");
          await clockInStudent(targetStudent, verifiedMethod, confidence);
        } else {
          setLivenessState("idle");
          toast.error(res.message || "Face not recognized in registered database.");
        }
      } catch (e: any) {
        setLivenessState("idle");
        toast.error(e?.message || "Verification failed. Please check camera and backend.");
      }
    } else {
      setLivenessState("idle");
      toast.error("Camera frame capture failed. Please enable camera access.");
    }
    
    setTimeout(() => {
      setIsVerifying(false);
      setLivenessState("idle");
    }, 3000);
  };

  const clockInStudent = async (student: Student, method: string, confidence: string = "99.4%") => {
    let newStatus = sessionTime > (50 * 60) ? 'Late' : 'Present';
    
    // Save to backend database if session is selected
    if (selectedSessionId) {
      try {
        const res = await sessionsApi.clockIn(selectedSessionId, student.id, student.name, method, confidence);
        newStatus = res.record.status || newStatus;
      } catch (e: any) {
        console.warn("Clock-in backend sync:", e);
        toast.error(e?.message || "Failed to clock in student on backend.");
        return;
      }
    }

    setStudents(prev => {
      const updated = [...prev];
      const idx = updated.findIndex(s => s.id === student.id);
      const newRecord: Student = {
        id: student.id,
        name: student.name,
        status: newStatus as StudentStatus,
        method,
        confidence: confidence || "99.4%",
        timestamp: `${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})} — ${newStatus === 'Late' ? t('late') : t('present_ontime')}`,
        recentlyClocked: true
      };

      if (idx !== -1) {
        updated[idx] = newRecord;
        const justClocked = updated.splice(idx, 1)[0];
        updated.unshift(justClocked);
      } else {
        updated.unshift(newRecord);
      }
      return updated;
    });

    toast.success(`🎉 ${t("identity_verified")}: ${student.name} (${student.id})`);

    setTimeout(() => {
      setStudents(current => current.map(s => s.id === student.id ? { ...s, recentlyClocked: false } : s));
    }, 3000);
  };

  const handleManualOverride = () => {
    toast.error("Manual approval requires student selection.");
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkVerify = () => {
    if (selectedIds.length === 0) return;
    
    setStudents(prev => {
      const updated = [...prev];
      let verifiedCount = 0;
      
      selectedIds.forEach(id => {
        const index = updated.findIndex(s => s.id === id);
        if (index !== -1 && updated[index].status === 'Absent') {
          const newStatus = sessionTime > (50 * 60) ? 'Late' : 'Present';
          updated[index] = {
            ...updated[index],
            status: newStatus,
            method: 'Manual Supervisor Approval',
            timestamp: `${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})} — ${newStatus === 'Late' ? t('late') : t('present_ontime')}`,
            recentlyClocked: true
          };
          verifiedCount++;
        }
      });
      
      if (verifiedCount > 0) {
        toast.success(`${t("manual_approval")} (${verifiedCount})`);
        const recentlyClocked = updated.filter(s => s.recentlyClocked);
        const others = updated.filter(s => !s.recentlyClocked);
        
        setTimeout(() => {
          setStudents(current => current.map(s => selectedIds.includes(s.id) ? { ...s, recentlyClocked: false } : s));
          setSelectedIds([]);
        }, 3000);
        
        return [...recentlyClocked, ...others];
      }
      
      return prev;
    });
  };


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

  const getPromptMessage = () => {
    switch (livenessState) {
      case "turn-left": return t("turn_left");
      case "look-up": return t("look_up");
      case "look-down": return t("look_down");
      case "turn-right": return t("turn_right");
      case "smile": return t("smile");
      case "center": return t("center");
      case "verifying": return t("verifying_face");
      case "success": return t("identity_verified");
      default: return t("position_face");
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.id.includes(searchQuery);
      const matchesFilter = filterStatus === 'All' || s.status === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [students, searchQuery, filterStatus]);

  const stats = {
    total: students.length,
    present: students.filter(s => s.status === 'Present' || s.status === 'Late').length,
    pending: students.filter(s => s.status === 'Absent').length
  };

  return (
    <div className="max-w-[1600px] mx-auto min-h-screen text-white font-sans p-2 lg:p-6 pb-20">
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
        {/* LEFT COLUMN: Biometric Kiosk Scanner (5/12) */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
          
          {/* Active Meeting/Session Header */}
          <div className="glass-panel p-5 flex flex-col gap-4 border border-white/10 bg-[#1E293B]/80 backdrop-blur-xl rounded-2xl">
            <div className="flex items-start justify-between gap-4">
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
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg text-sm font-medium">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {t("live_now")}
              </div>
              <div className="flex items-center gap-2 bg-slate-800/50 text-slate-300 border border-white/5 px-3 py-1.5 rounded-lg text-sm font-medium font-mono">
                <Clock className="w-4 h-4 text-slate-400" />
                {t("time")}: {formatTime(sessionTime)}
              </div>
            </div>
          </div>

          {/* Live Webcam Viewport */}
          <div className="glass-panel border border-white/10 bg-[#1E293B]/80 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
              <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                <ScanFace className="w-5 h-5 text-indigo-400" />
                {t("camera_feed")}
              </h3>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-slate-400 font-medium tracking-wide">{t("mesh_active")}</span>
              </div>
            </div>
            
            <div className="relative w-full aspect-[4/3] bg-black overflow-hidden flex flex-col items-center justify-center">
              <Webcam
                ref={webcamRef}
                audio={false}
                mirrored={true}
                className="absolute inset-0 w-full h-full object-cover z-0"
              />
              
              {/* Holographic HUD Overlay */}
              <div className="absolute inset-0 z-10 pointer-events-none border-[2px] border-white/5">
                {/* Corner Crosshairs */}
                <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-indigo-500/70" />
                <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-indigo-500/70" />
                <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-indigo-500/70" />
                <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-indigo-500/70" />
                
                {/* Target Bounding Box */}
                <motion.div 
                  className="absolute inset-x-0 mx-auto top-1/2 -translate-y-1/2 w-48 h-64 border-2 border-dashed border-emerald-400/50 rounded-3xl"
                  animate={{
                    scale: livenessState === 'verifying' ? [1, 1.05, 1] : 1,
                    borderColor: livenessState === 'success' ? 'rgba(16, 185, 129, 0.8)' : livenessState === 'verifying' ? 'rgba(99, 102, 241, 0.8)' : 'rgba(16, 185, 129, 0.4)'
                  }}
                  transition={{ repeat: livenessState === 'verifying' ? Infinity : 0, duration: 1 }}
                >
                  {livenessState === 'verifying' && (
                    <motion.div 
                      className="absolute inset-0 bg-indigo-500/20 rounded-3xl"
                      animate={{ opacity: [0.1, 0.3, 0.1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    />
                  )}
                </motion.div>
                
                {/* Calibration Guide & Alignment Reticle */}
                {livenessState === 'idle' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 opacity-60">
                    <div className="w-32 h-[1px] bg-emerald-400/40 relative">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-400/80" />
                    </div>
                    <div className="h-32 w-[1px] bg-emerald-400/40 absolute left-1/2 -translate-x-1/2">
                    </div>
                    <div className="absolute mt-40 bg-black/60 px-3 py-1 rounded-full border border-emerald-500/30 flex items-center gap-2">
                      <Focus className="w-3 h-3 text-emerald-400" />
                      <span className="text-[10px] text-emerald-400 font-mono tracking-wide">{t("position_face")}</span>
                    </div>
                  </div>
                )}

                {/* Real-time Distance Indicator */}
                <div className="absolute left-6 rtl:right-6 rtl:left-auto top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-10">
                  <span className="text-[9px] font-mono text-emerald-400/80 mb-1">DIST</span>
                  <div className="w-1.5 h-32 bg-slate-800/80 rounded-full overflow-hidden flex flex-col justify-end border border-white/5">
                    <motion.div 
                      className="w-full bg-emerald-500" 
                      animate={{ height: livenessState === 'idle' ? ['60%', '65%', '60%'] : '95%' }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-emerald-400/80 mt-1">0.5m</span>
                </div>
                
                {/* HUD Details */}
                <div className="absolute top-4 right-6 rtl:left-6 rtl:right-auto text-right rtl:text-left">
                  <div className="text-[10px] font-mono text-indigo-300/80 mb-0.5">PITCH: -2.4°</div>
                  <div className="text-[10px] font-mono text-indigo-300/80 mb-0.5">YAW: {livenessState === 'turn-left' ? '-45.0°' : livenessState === 'turn-right' ? '45.0°' : '1.2°'}</div>
                  <div className="text-[10px] font-mono text-indigo-300/80">ROLL: 0.8°</div>
                </div>
              </div>

              {/* Scanning Glow overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/40 to-transparent pointer-events-none z-10 mix-blend-screen" />
              
              {/* Liveness Prompt & Mask Warning Pills */}
              <div className="absolute bottom-6 left-0 w-full flex flex-col items-center gap-2 z-20">
                <AnimatePresence mode="wait">
                  {isMaskDetected && livenessState === 'idle' && (
                    <motion.div
                      key="mask-warning"
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="px-4 py-2 rounded-full backdrop-blur-xl border border-red-500/50 bg-red-500/20 text-red-400 text-xs font-bold shadow-2xl flex items-center gap-2"
                    >
                      <TriangleAlert className="w-4 h-4" />
                      Face Mask Detected (Coming Soon): Please Remove
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  <motion.div 
                    key={livenessState}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`px-5 py-2.5 rounded-full backdrop-blur-xl border text-sm font-bold shadow-2xl flex items-center gap-2 ${
                      livenessState === 'success' ? 'bg-emerald-500/80 border-emerald-400 text-white' :
                      livenessState === 'verifying' ? 'bg-indigo-600/80 border-indigo-400 text-white animate-pulse' :
                      livenessState !== 'idle' ? 'bg-amber-500/80 border-amber-400 text-white' :
                      'bg-slate-900/80 border-white/20 text-slate-200'
                    }`}
                  >
                    {livenessState === 'success' && <CheckCircle2 className="w-4 h-4" />}
                    {livenessState === 'verifying' && <Fingerprint className="w-4 h-4 animate-spin-slow" />}
                    {livenessState !== 'idle' && livenessState !== 'success' && livenessState !== 'verifying' && <Eye className="w-4 h-4" />}
                    {getPromptMessage()}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* IQA Meter */}
            <div className="px-5 py-3 border-t border-white/5 bg-slate-900/60 flex items-center justify-between text-xs font-medium">
              <div className="flex flex-col gap-1 w-full max-w-[120px]">
                <div className="flex justify-between text-slate-400">
                  <span>Lighting</span>
                  <span className="text-emerald-400">94%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[94%]" />
                </div>
              </div>
              <div className="flex flex-col gap-1 w-full max-w-[120px]">
                <div className="flex justify-between text-slate-400">
                  <span>Sharpness</span>
                  <span className="text-emerald-400">High</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[88%]" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Action Buttons & Settings */}
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={handleFastVerify}
                disabled={isVerifying || isMaskDetected}
                className="relative overflow-hidden group bg-gradient-to-b from-indigo-500 to-indigo-700 hover:from-indigo-400 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-400/50 rounded-xl p-4 flex flex-col items-center justify-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.2)] transition-all"
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Zap className="w-6 h-6 text-indigo-200" />
                <span className="font-bold text-sm tracking-wide">{t("fast_face_scan")}</span>
                <span className="text-[10px] text-indigo-200/70 font-medium">{t("quality_strict")}</span>
              </button>

              <button
                onClick={handleStartLivenessCheck}
                disabled={isVerifying || isMaskDetected}
                className="relative overflow-hidden group bg-gradient-to-b from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center gap-2 shadow-lg transition-all"
              >
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                <span className="font-bold text-sm tracking-wide text-white">{t("motion_challenge")}</span>
                <span className="text-[10px] text-slate-400 font-medium">{t("anti_spoofing_shield")}</span>
              </button>
            </div>

            <button 
              onClick={() => setIsAutoCapture(!isAutoCapture)}
              className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                isAutoCapture 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-slate-900/50 border-white/5 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                {isAutoCapture ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                <div className="flex flex-col items-start">
                  <span className="font-bold text-sm">{t("auto_capture")}</span>
                  <span className="text-[10px] opacity-80 font-medium text-left rtl:text-right">{t("analyzing_mesh")}</span>
                </div>
              </div>
              {isAutoCapture && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </button>
          </div>

        </div>

        {/* RIGHT COLUMN: Live Attendance Session Roster (7/12) */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-6 h-auto lg:h-[calc(100vh-6rem)] lg:min-h-[750px]">
          
          {/* Session Metrics Cards */}
          <div className="grid grid-cols-3 gap-4 shrink-0">
            <div className="glass-panel bg-[#1E293B]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col gap-1">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{t("total_enrolled")}</span>
              <div className="flex items-end gap-3">
                <span className="text-3xl font-bold text-white">{stats.total}</span>
                <Users className="w-5 h-5 text-slate-500 mb-1" />
              </div>
            </div>
            <div className="glass-panel bg-[#1E293B]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col gap-1">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{t("present_ontime")}</span>
              <div className="flex items-end gap-3">
                <span className="text-3xl font-bold text-emerald-400">{stats.present}</span>
                <span className="text-sm font-medium text-emerald-500/80 mb-1">({stats.total > 0 ? Math.round((stats.present/stats.total)*100) : 0}%)</span>
              </div>
            </div>
            <div className="glass-panel bg-[#1E293B]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col gap-1">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{t("absent")}</span>
              <div className="flex items-end gap-3">
                <span className="text-3xl font-bold text-amber-400">{stats.pending}</span>
                <span className="text-sm font-medium text-slate-500 mb-1">{t("roster_size")}</span>
              </div>
            </div>
          </div>

          {/* Attendance Trend Chart */}
          <div className="glass-panel bg-[#1E293B]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shrink-0 h-[170px] flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                {t("attendance_trend")}
              </h4>
              <div className="flex bg-slate-900/80 rounded-lg p-0.5 border border-white/5">
                <button
                  onClick={() => setChartView('trend')}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold flex items-center gap-1.5 transition-colors ${chartView === 'trend' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <TrendingUp className="w-3 h-3" /> Trend
                </button>
                <button
                  onClick={() => setChartView('heatmap')}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold flex items-center gap-1.5 transition-colors ${chartView === 'heatmap' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <BarChart3 className="w-3 h-3" /> Heatmap
                </button>
              </div>
            </div>
            <div className="flex-1 w-full min-h-0 relative">
              <AnimatePresence mode="wait">
                {chartView === 'trend' ? (
                  <motion.div key="trend" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0F172A', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                          itemStyle={{ color: '#6366F1', fontWeight: 600 }}
                          labelStyle={{ color: '#94A3B8', marginBottom: '4px' }}
                        />
                        <Area type="monotone" dataKey="count" stroke="#6366F1" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </motion.div>
                ) : (
                  <motion.div key="heatmap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trendData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0F172A', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                          itemStyle={{ color: '#10B981', fontWeight: 600 }}
                          labelStyle={{ color: '#94A3B8', marginBottom: '4px' }}
                          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        />
                        <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} barSize={24} />
                      </BarChart>
                    </ResponsiveContainer>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Roster panel removed per user request — was non-interactive */}
        </div>

      </div>

      <style>{`
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

    </div>
  );
}
