import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Webcam from "react-webcam";
import { motion, AnimatePresence } from "motion/react";
import { UserPlus, User, Mail, Lock, Briefcase, ScanFace, Loader2, CheckCircle2, ShieldCheck, RefreshCw, Compass, AlertCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import { biometricsApi, usersApi } from "../lib/api";

const GESTURE_LABELS: Record<string, { title: string; instruction: string; icon: string }> = {
  STRAIGHT: { title: "Look Straight", instruction: "Look directly at the camera", icon: "😐" },
  TURN_LEFT: { title: "Turn Head Left", instruction: "Slowly turn your head to your left side", icon: "👈" },
  TURN_RIGHT: { title: "Turn Head Right", instruction: "Slowly turn your head to your right side", icon: "👉" },
  LOOK_UP: { title: "Look Up", instruction: "Slowly tilt your head upward", icon: "👆" },
  LOOK_DOWN: { title: "Look Down", instruction: "Slowly tilt your head downward", icon: "👇" },
};

export function Register() {
  const navigate = useNavigate();
  const webcamRef = useRef<Webcam>(null);
  const [scanState, setScanState] = useState<"idle" | "scanning" | "success">("idle");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Student");

  // 3D Active Motion Challenge State
  const [challenges, setChallenges] = useState<string[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepFeedback, setStepFeedback] = useState<string>("");
  const [livenessToken, setLivenessToken] = useState<string | null>(null);
  const [capturedImageBase64, setCapturedImageBase64] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [framesPassedForCurrentPose, setFramesPassedForCurrentPose] = useState(0);

  // Active Motion Verification Runner
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let isCancelled = false;

    async function runVerificationLoop() {
      if (scanState !== "scanning" || challenges.length === 0 || currentStepIndex >= challenges.length) {
        return;
      }

      const activeChallenge = challenges[currentStepIndex];

      const frame = webcamRef.current?.getScreenshot();
      if (frame) {
        try {
          const res = await biometricsApi.verifyStep(activeChallenge, frame);
          if (res.status === "success") {
            setFramesPassedForCurrentPose((prev) => {
              const newCount = prev + 1;
              if (newCount >= 2) {
                setStepFeedback(`✅ ${activeChallenge} Verified!`);
                advanceChallenge();
                return 0; // reset for next
              } else {
                setStepFeedback(`✅ Frame ${newCount}/2 captured! Hold still...`);
                return newCount;
              }
            });
            if (!isCancelled && scanState === "scanning") {
              timer = setTimeout(runVerificationLoop, 300);
            }
            return;
          }
        } catch (err: any) {
          setStepFeedback(err.message || `Please ${GESTURE_LABELS[activeChallenge]?.title || activeChallenge}...`);
        }
      }

      if (!isCancelled && scanState === "scanning") {
        timer = setTimeout(runVerificationLoop, 300);
      }
    }

    if (scanState === "scanning") {
      runVerificationLoop();
    }

    return () => {
      isCancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [scanState, currentStepIndex, challenges]);

  const advanceChallenge = () => {
    if (currentStepIndex + 1 < challenges.length) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      // All challenges completed!
      const finalSnap = webcamRef.current?.getScreenshot();
      setCapturedImageBase64(finalSnap || null);
      setLivenessToken("motion_verified");
      setScanState("success");
      toast.success("🎉 All 3D Motion Challenges Passed! Biometric profile ready.");
    }
  };

  const handleStartBiometrics = async () => {
    setRegistrationError(null);
    try {
      setScanState("scanning");
      setCurrentStepIndex(0);
      setStepFeedback("Initializing 3D spatial challenge...");
      const res = await biometricsApi.getChallenge();
      setChallenges(res.challenges || ["STRAIGHT", "TURN_LEFT", "TURN_RIGHT"]);
      setFramesPassedForCurrentPose(0);
    } catch (err: any) {
      setScanState("idle");
      const message = err.message || "Failed to initialize motion challenges. Is backend running?";
      setRegistrationError(message);
      toast.error(message);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistrationError(null);
    if (scanState !== "success" || !livenessToken || !capturedImageBase64) {
      toast.error("Please complete the 3D Motion Challenge to enroll biometrics.");
      return;
    }

    if (!email.trim() || !password.trim() || !fullName.trim()) {
      toast.error("Please fill in all registration fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Register face biometrics with verified liveness token
      await biometricsApi.register(email.trim(), capturedImageBase64, livenessToken);

      // 2. Provision User account & RBAC role
      await usersApi.provision({
        full_name: fullName.trim(),
        email: email.trim(),
        password: password.trim(),
        role: role,
        university: "Faculty of Engineering",
        department: "Computer Science",
      });

      toast.success("Registration complete! Your biometric profile has been created.");
      navigate("/login");
    } catch (err: any) {
      const message = err.message || "Registration failed. Please try again.";
      setRegistrationError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeGesture = challenges[currentStepIndex] ? GESTURE_LABELS[challenges[currentStepIndex]] : null;

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 py-12 relative overflow-y-auto bg-background">
      {/* Background Decor */}
      <div className="absolute top-[20%] left-[80%] w-[35%] h-[35%] bg-accent rounded-full blur-[140px] opacity-20 pointer-events-none" />
      <div className="absolute bottom-[20%] right-[70%] w-[45%] h-[45%] bg-accent rounded-full blur-[120px] opacity-10 pointer-events-none" />

      <div className="glass-panel w-full max-w-6xl rounded-3xl flex flex-col lg:flex-row relative z-10 shadow-2xl overflow-hidden">
        
        {/* Left Side: Biometric Registration & 3D Motion Wizard */}
        <div className="w-full lg:w-5/12 p-5 sm:p-8 border-b lg:border-b-0 lg:border-r border-glass-border flex flex-col items-center justify-center relative bg-surface/30 overflow-y-auto min-h-[500px]">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-text-main flex items-center justify-center gap-2">
              <ScanFace className="text-accent" size={28} />
              Enroll Biometrics
            </h2>
          </div>

          {/* Active Challenge Breadcrumbs */}
          {challenges.length > 0 && scanState === "scanning" && (
            <div className="flex items-center gap-2 mb-3">
              {challenges.map((ch, idx) => (
                <div
                  key={idx}
                  className={`px-2.5 py-1 rounded-full text-xs font-mono font-medium transition-all ${
                    idx < currentStepIndex
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : idx === currentStepIndex
                      ? "bg-accent/20 text-accent border border-accent animate-pulse"
                      : "bg-surface text-text-muted border border-glass-border"
                  }`}
                >
                  Step {idx + 1}: {ch.replace("_", " ")}
                </div>
              ))}
            </div>
          )}

          <div 
            className="relative w-full max-w-[300px] aspect-[3/4] overflow-hidden rounded-[50%] bg-black/80 ring-1 ring-glass-border shadow-2xl transition-all"
          >
            {/* Webcam Feed */}
            <Webcam
              ref={webcamRef}
              audio={false}
              mirrored={true}
              screenshotFormat="image/jpeg"
              className="w-full h-full object-cover"
              videoConstraints={{ facingMode: "user", width: 480, height: 640 }}
            />

            {/* Scanner Overlay Box */}
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none p-4">
              <div className={`w-full h-full border-2 border-dashed transition-colors duration-500 relative flex items-center justify-center ${
                  scanState === "success" ? "border-success bg-success/10" : "border-accent/50"
              }`} style={{ borderRadius: "50%" }}>
                
                {/* Laser Scan Line */}
                {scanState === "scanning" && (
                  <motion.div
                    className="absolute left-0 right-0 h-1 bg-accent/80 shadow-[0_0_20px_rgba(var(--accent),1)]"
                    initial={{ top: "10%" }}
                    animate={{ top: ["10%", "90%", "10%"] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
                
                {/* Mesh generating visuals */}
                {scanState === "scanning" && (
                  <motion.div
                    className="absolute inset-0 bg-accent/20"
                    style={{ borderRadius: "50%" }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.4, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}
              </div>
            </div>

            {/* Scanning Overlay Text & Challenge Directive */}
            {scanState === "scanning" && activeGesture && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-end p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                <div className="flex flex-col items-center text-center text-white pb-2">
                  <span className="text-2xl mb-1">{activeGesture.icon}</span>
                  <span className="font-bold text-sm text-accent-light tracking-wide">
                    {activeGesture.title}
                  </span>
                  <span className="text-xs text-text-muted mt-0.5 max-w-[240px]">
                    {activeGesture.instruction}
                  </span>
                  {scanState === "scanning" && (
                    <span className="text-[13px] font-semibold text-emerald-400 mt-2">
                      Frame {framesPassedForCurrentPose}/2 {framesPassedForCurrentPose >= 2 ? '✓' : ''}
                    </span>
                  )}
                  {stepFeedback && (
                    <span className="text-[11px] text-amber-300 font-mono mt-1 bg-black/60 px-2 py-0.5 rounded-md border border-amber-300/30">
                      {stepFeedback}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Status Overlay */}
            {scanState === "success" && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md text-white">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="bg-success rounded-full p-5 mb-4 shadow-[0_0_30px_rgba(16,185,129,0.5)]"
                >
                  <CheckCircle2 size={48} className="text-white" />
                </motion.div>
                <h3 className="text-2xl font-bold tracking-tight">Biometrics Verified</h3>
                <p className="text-sm opacity-80 mt-1">3D Liveness Authenticated</p>
              </div>
            )}
          </div>

          <button 
            type="button"
            onClick={handleStartBiometrics}
            disabled={scanState === "scanning"}
            className={`mt-6 w-full max-w-[320px] btn-primary ${scanState === 'scanning' ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {scanState === "idle" && (
              <>
                <Compass size={18} />
                Start 3D Motion Challenge
              </>
            )}
            {scanState === "scanning" && (
              <>
                <Loader2 className="animate-spin" size={18} />
                Tracking 3D Motion...
              </>
            )}
            {scanState === "success" && (
              <>
                <RefreshCw size={18} />
                Re-verify Biometrics
              </>
            )}
          </button>
        </div>

        {/* Right Side: Standard Registration Form */}
        <div className="w-full lg:w-7/12 p-5 sm:p-8 lg:p-12 flex flex-col justify-center bg-surface/50 overflow-y-auto min-h-[500px]">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck className="text-accent" size={32} />
              <h1 className="text-3xl font-bold tracking-tight">System Registration</h1>
            </div>
            <p className="text-text-muted">Create a new Secure-FEPRH identity profile.</p>
          </div>

          <form onSubmit={handleRegister} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-text-main">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User size={18} className="text-text-muted" />
                  </div>
                  <input
                    type="text"
                    className="input-field w-full pl-10"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-text-main">Role</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Briefcase size={18} className="text-text-muted" />
                  </div>
                  <select
                    className="input-field w-full pl-10 appearance-none bg-surface"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                  >
                    <option value="Student">Student</option>
                    <option value="Faculty Member">Faculty Member</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="University Admin">University Admin</option>
                    <option value="Ministry Admin">Ministry Admin</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-text-main">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} className="text-text-muted" />
                </div>
                <input
                  type="email"
                  className="input-field w-full pl-10"
                  placeholder="student@university.edu.eg"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-text-main">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-text-muted" />
                </div>
                <input
                  type="password"
                  className="input-field w-full pl-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <p className="text-xs text-text-muted mt-2">Must be at least 8 characters long.</p>
            </div>

            {registrationError && (
              <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs leading-relaxed text-red-300" role="alert" aria-live="polite">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{registrationError}</span>
              </div>
            )}

            <button 
              type="submit" 
              className={`btn-primary w-full mt-2 ${scanState !== 'success' || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={scanState !== "success" || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Creating Account...
                </>
              ) : (
                <>
                  <UserPlus size={18} />
                  Complete Registration
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-text-muted">
            Already have a profile?{" "}
            <Link to="/login" className="text-accent hover:text-accent-hover font-medium transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
