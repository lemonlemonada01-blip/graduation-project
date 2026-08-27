import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Webcam from "react-webcam";
import { motion } from "motion/react";
import { ScanFace, Mail, Lock, ShieldCheck, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import { biometricsApi, apiFetch } from "../lib/api";

export function Login() {
  const navigate = useNavigate();
  const webcamRef = useRef<Webcam>(null);
  const [scanState, setScanState] = useState<"idle" | "scanning" | "success">("idle");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBiometricLogin = async () => {
    setAuthError(null);
    if (!email.trim()) {
      toast.error("Please enter your Email or Student ID first to verify your identity.");
      setAuthError("Email / Student ID required for facial lookup");
      return;
    }

    const imageBase64 = webcamRef.current?.getScreenshot();
    if (!imageBase64) {
      toast.error("Could not capture frame from webcam. Please ensure camera permissions are allowed.");
      return;
    }

    setScanState("scanning");

    try {
      const response = await biometricsApi.authenticate(email.trim(), imageBase64);
      if (response.authenticated) {
        setScanState("success");
        if (response.token) {
          localStorage.setItem("auth_token", response.token);
        }
        localStorage.setItem("user_email", email.trim());
        if (response.user) {
          localStorage.setItem("user_data", JSON.stringify(response.user));
        }
        toast.success(response.message || "Identity Verified. Access Granted!");

        setTimeout(() => {
          navigate("/");
        }, 1200);
      }
    } catch (err: any) {
      setScanState("idle");
      const message = err.message || "Face does not match registered profile records.";
      setAuthError(message);
      toast.error(message);
    }
  };

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsSubmitting(true);
    try {
      const data = await apiFetch<{ access_token: string; user?: any }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });

      localStorage.setItem("auth_token", data.access_token);
      localStorage.setItem("user_email", email.trim());
      if (data.user) {
        localStorage.setItem("user_data", JSON.stringify(data.user));
      }
      toast.success("Signed in successfully");
      navigate("/");
    } catch (err: any) {
      const message = err.message || "Invalid credentials";
      setAuthError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent rounded-full blur-[120px] opacity-20 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-accent rounded-full blur-[100px] opacity-10 pointer-events-none" />

      <div className="glass-panel w-full max-w-5xl rounded-3xl flex flex-col md:flex-row overflow-hidden relative z-10 shadow-2xl">
        
        {/* Left Side: Biometric Scanner */}
        <div className="w-full md:w-1/2 p-5 sm:p-8 border-b md:border-b-0 md:border-r border-glass-border flex flex-col items-center justify-center relative bg-surface/30">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-text-main flex items-center justify-center gap-2">
              <ScanFace className="text-accent" size={28} />
              Biometric Login
            </h2>
            <p className="text-sm text-text-muted mt-2">Position your face within the frame to verify identity</p>
          </div>

          <div 
            className="relative w-full max-w-[300px] aspect-[3/4] overflow-hidden rounded-[50%] bg-black/80 ring-1 ring-glass-border shadow-2xl mx-auto"
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
                    className="absolute left-0 right-0 h-1 bg-accent shadow-[0_0_15px_rgba(var(--accent),0.8)]"
                    initial={{ top: "0%" }}
                    animate={{ top: ["0%", "100%", "0%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  />
                )}
                
                {/* Pulsating dots for active scanning */}
                {scanState === "scanning" && (
                  <motion.div
                    className="absolute inset-0 bg-accent/10"
                    style={{ borderRadius: "50%" }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.3, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
              </div>
            </div>

            {/* Status Overlay */}
            {scanState === "success" && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm text-white">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="bg-success rounded-full p-4 mb-4 shadow-[0_0_25px_rgba(16,185,129,0.6)]"
                >
                  <CheckCircle2 size={40} className="text-white" />
                </motion.div>
                <h3 className="text-xl font-bold">Identity Verified</h3>
                <p className="text-sm opacity-80 mt-1">Access Granted</p>
              </div>
            )}
          </div>

          {authError && (
            <div className="mt-3 w-full max-w-[320px] flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs leading-relaxed" role="alert" aria-live="polite">
              <AlertCircle size={16} className="shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <button 
            type="button"
            onClick={handleBiometricLogin}
            disabled={scanState !== "idle"}
            className={`mt-6 w-full max-w-[320px] btn-primary ${scanState !== 'idle' ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {scanState === "idle" && (
              <>
                <ScanFace size={18} />
                Verify Face
              </>
            )}
            {scanState === "scanning" && (
              <>
                <Loader2 className="animate-spin" size={18} />
                Verifying Biometrics...
              </>
            )}
            {scanState === "success" && (
              <>
                <CheckCircle2 size={18} />
                Verified
              </>
            )}
          </button>
        </div>

        {/* Right Side: Standard Login Form */}
        <div className="w-full md:w-1/2 p-5 sm:p-8 md:p-12 flex flex-col justify-center bg-surface/50">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck className="text-accent" size={32} />
              <h1 className="text-3xl font-bold tracking-tight">Secure-FEPRH</h1>
            </div>
            <p className="text-text-muted">Enter your credentials to access the system.</p>
          </div>

          <form onSubmit={handleStandardLogin} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-text-main">Email Address / Student ID</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} className="text-text-muted" />
                </div>
                <input
                  type="text"
                  className="input-field w-full pl-10"
                  placeholder="Email or Student ID"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (authError) setAuthError(null);
                  }}
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-text-main">Password</label>
                <button 
                  type="button" 
                  onClick={() => toast("Contact your administrator to reset your password", { icon: "ℹ️" })}
                  className="text-xs text-accent hover:text-accent-hover font-medium bg-transparent border-none p-0 cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
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
                />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full mt-2" disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="animate-spin" size={18} /> Signing in...</>
              ) : (
                <>Sign In</>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-text-muted">
            Don't have an account?{" "}
            <Link to="/register" className="text-accent hover:text-accent-hover font-medium transition-colors">
              Request Access
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
