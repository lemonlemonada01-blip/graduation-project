import re
import json

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
timer_logic_regex = r"useEffect\(\(\) => \{\s*const timer = setInterval\(\(\) => setSessionTime\(t => t \+ 1\), 1000\);\s*return \(\) => clearInterval\(timer\);\s*\}, \[\]\);"
new_timer_logic = """useEffect(() => {
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
content = re.sub(timer_logic_regex, new_timer_logic, content)

# 7. Use trendData in Chart
content = content.replace("data={ATTENDANCE_TREND}", "data={trendData}")

with open("D:/AI engine/frontend/src/pages/Attendance.tsx", "w", encoding="utf-8") as f:
    f.write(content)
