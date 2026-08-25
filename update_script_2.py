import re

with open("D:/AI engine/frontend/src/pages/Attendance.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove INITIAL_STUDENTS
content = re.sub(r"const INITIAL_STUDENTS: Student\[\] = \[.*?\];\n+", "", content, flags=re.DOTALL)

# 2. Remove ATTENDANCE_TREND
content = re.sub(r"const ATTENDANCE_TREND = \[.*?\];\n+", "", content, flags=re.DOTALL)

# 3. Replace students state
content = content.replace("const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);", "const [students, setStudents] = useState<Student[]>([]);")

# 4. Remove mock random mask detection
mask_timer_regex = r"// Mock random mask detection\s*useEffect\(\(\) => \{\s*const maskTimer = setInterval\(\(\) => \{\s*if \(!isVerifying && livenessState === 'idle'\) \{\s*setIsMaskDetected\(true\);\s*setTimeout\(\(\) => setIsMaskDetected\(false\), 5000\);\s*\}\s*\}, 25000\);\s*return \(\) => clearInterval\(maskTimer\);\s*\}, \[isVerifying, livenessState\]\);"
content = re.sub(mask_timer_regex, "", content, flags=re.DOTALL)

# 5. Add trend data state and fetch
trend_state_addition = """  const [trendData, setTrendData] = useState<any[]>([]);
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
  }, []);"""
content = content.replace("const [sessionTime, setSessionTime] = useState(45 * 60 + 12);", trend_state_addition + "\n  const [sessionTime, setSessionTime] = useState(0);")

# 6. Replace session timer logic
timer_logic_search = """  useEffect(() => {
    const timer = setInterval(() => setSessionTime(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);"""

new_timer_logic = """  useEffect(() => {
    if (!selectedSessionId || availableSessions.length === 0) return;
    const session = availableSessions.find(s => s.id === selectedSessionId);
    if (!session || !session.timeRange) return;

    const [startStr] = session.timeRange.split(' - ');
    
    const calculateElapsed = () => {
      const now = new Date();
      const match = startStr.match(/(\\d+):(\\d+)\\s*(AM|PM)/i);
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
  }, [selectedSessionId, availableSessions]);"""

content = content.replace(timer_logic_search, new_timer_logic)

# 7. Use trendData in Chart
content = content.replace("data={ATTENDANCE_TREND}", "data={trendData}")

# 8. Update clockInNextAbsentStudent to clockInStudent
clockin_old = """  const clockInNextAbsentStudent = async (method: string) => {
    const absentIndex = students.findIndex(s => s.status === 'Absent');
    if (absentIndex === -1) {
      toast.error(t("clocked_in"));
      return;
    }
    
    const student = students[absentIndex];
    const newStatus = sessionTime > (50 * 60) ? 'Late' : 'Present';
    
    // Save to backend database if session is selected
    if (selectedSessionId) {
      try {
        await sessionsApi.clockIn(selectedSessionId, student.id, student.name, method, "99.4%");
      } catch (e) {
        console.warn("Clock-in backend sync:", e);
      }
    }

    setStudents(prev => {
      const updated = [...prev];
      const idx = updated.findIndex(s => s.id === student.id);
      if (idx !== -1) {
        updated[idx] = {
          ...updated[idx],
          status: newStatus,
          method,
          timestamp: `${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})} — ${newStatus === 'Late' ? t('late') : t('present_ontime')}`,
          recentlyClocked: true
        };
        const justClocked = updated.splice(idx, 1)[0];
        updated.unshift(justClocked);
      }
      return updated;
    });

    toast.success(`🎉 ${t("identity_verified")}: ${student.name} (${student.id})`);

    setTimeout(() => {
      setStudents(current => current.map(s => s.id === student.id ? { ...s, recentlyClocked: false } : s));
    }, 3000);
  };"""

clockin_new = """  const clockInStudent = async (student: Student, method: string, confidence: string = "99.4%") => {
    let newStatus = sessionTime > (50 * 60) ? 'Late' : 'Present';
    
    // Save to backend database if session is selected
    if (selectedSessionId) {
      try {
        const res = await sessionsApi.clockIn(selectedSessionId, student.id, student.name, method, confidence);
        newStatus = res.record.status || newStatus;
      } catch (e) {
        console.warn("Clock-in backend sync:", e);
        // Note: 4J - Removing silent error catches that clock in student anyway on backend failure
        toast.error("Failed to clock in student on backend.");
        return; // Don't proceed to update UI if backend fails
      }
    }

    setStudents(prev => {
      const updated = [...prev];
      const idx = updated.findIndex(s => s.id === student.id);
      if (idx !== -1) {
        updated[idx] = {
          ...updated[idx],
          status: newStatus as StudentStatus,
          method,
          timestamp: `${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})} — ${newStatus === 'Late' ? t('late') : t('present_ontime')}`,
          recentlyClocked: true
        };
        const justClocked = updated.splice(idx, 1)[0];
        updated.unshift(justClocked);
      }
      return updated;
    });

    toast.success(`🎉 ${t("identity_verified")}: ${student.name} (${student.id})`);

    setTimeout(() => {
      setStudents(current => current.map(s => s.id === student.id ? { ...s, recentlyClocked: false } : s));
    }, 3000);
  };"""
content = content.replace(clockin_old, clockin_new)

# 9. Update handleFastVerify
fastverify_old = """    if (screenshot) {
      try {
        const nextAbsent = students.find(s => s.status === 'Absent');
        if (nextAbsent) {
          const res = await biometricsApi.authenticate(nextAbsent.id, screenshot);
          if (res.authenticated) {
            verifiedMethod = `Fast Face ID (Matched)`;
          }
        }
      } catch (e) {
        // Graceful fallback
      }
    }
    
    setTimeout(async () => {
      setLivenessState("success");
      await clockInNextAbsentStudent(verifiedMethod);
      
      setTimeout(() => {
        setIsVerifying(false);
        setLivenessState("idle");
      }, 3000);
    }, 1500);"""

fastverify_new = """    if (screenshot) {
      try {
        const res = await biometricsApi.identify(screenshot);
        if (res.authenticated) {
          const confidence = res.distance !== undefined ? `${((1 - res.distance) * 100).toFixed(1)}%` : "99.8%";
          verifiedMethod = `Fast Face ID (Matched - ${confidence})`;
          const matchedStudent = students.find(s => s.id === res.student_id);
          
          setLivenessState("success");
          if (matchedStudent) {
            await clockInStudent(matchedStudent, verifiedMethod, confidence);
          } else {
             toast.error("Student identified but not in this session roster.");
          }
        } else {
          setLivenessState("idle");
          toast.error("Face not recognized.");
        }
      } catch (e) {
        setLivenessState("idle");
        toast.error("API error during verification.");
      }
    } else {
      setLivenessState("idle");
    }
    
    setTimeout(() => {
      setIsVerifying(false);
      setLivenessState("idle");
    }, 3000);"""
content = content.replace(fastverify_old, fastverify_new)

# 10. Update handleStartLivenessCheck
liveness_old = """      let verifiedMethod = "3D Biometric Verified 99.8%";
      if (screenshot) {
        try {
          const nextAbsent = students.find(s => s.status === 'Absent');
          if (nextAbsent) {
            const res = await biometricsApi.authenticate(nextAbsent.id, screenshot);
            if (res.authenticated) {
              const score = res.distance ? ((1 - res.distance) * 100).toFixed(1) : "99.8";
              verifiedMethod = `3D Biometric Verified ${score}%`;
            }
          }
        } catch (e) {
          // Graceful fallback to demo mode
        }
      }
      
      await clockInNextAbsentStudent(verifiedMethod);"""

liveness_new = """      if (screenshot) {
        try {
          const res = await biometricsApi.identify(screenshot);
          if (res.authenticated) {
            const score = res.distance !== undefined ? ((1 - res.distance) * 100).toFixed(1) : "99.8";
            let verifiedMethod = `3D Biometric Verified ${score}%`;
            const matchedStudent = students.find(s => s.id === res.student_id);
            if (matchedStudent) {
              await clockInStudent(matchedStudent, verifiedMethod, `${score}%`);
            } else {
              toast.error("Student identified but not in this session roster.");
            }
          } else {
            toast.error("Face not recognized.");
          }
        } catch (e) {
          toast.error("Authentication failed.");
        }
      }"""
content = content.replace(liveness_old, liveness_new)

# 11. Add "Coming Soon" for Mask Detection Warning
content = content.replace("Face Mask Detected: Please Remove", "Face Mask Detected (Coming Soon): Please Remove")

# 12. Fix manual overrides
content = content.replace('clockInNextAbsentStudent("Manual Supervisor Approval");', 'toast.error("Manual approval requires student selection.");')

with open("D:/AI engine/frontend/src/pages/Attendance.tsx", "w", encoding="utf-8") as f:
    f.write(content)
