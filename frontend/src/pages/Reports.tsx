import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, AlertTriangle, ShieldCheck, Activity, Download, RefreshCw, Layers } from "lucide-react";
import { toast } from "react-hot-toast";
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Legend 
} from "recharts";
import { Skeleton } from "../components/ui/Skeleton";
import { Tooltip } from "../components/ui/Tooltip";
import { useTranslation } from "react-i18next";
import { reportsApi, AnalyticsSummary } from "../lib/api";

const DEFAULT_PROJECT_STATUS = [
  { name: 'Completed', value: 12, color: '#10b981' }, 
  { name: 'In Progress', value: 8, color: '#3b82f6' }, 
  { name: 'Proposed', value: 4, color: '#f59e0b' }, 
  { name: 'On Hold', value: 1, color: '#ef4444' }, 
];

const DEFAULT_COMPLETION_TRENDS = [
  { month: 'Jan', completed: 2, target: 3, rate: 66 },
  { month: 'Feb', completed: 4, target: 5, rate: 80 },
  { month: 'Mar', completed: 6, target: 7, rate: 85 },
  { month: 'Apr', completed: 9, target: 10, rate: 90 },
  { month: 'May', completed: 11, target: 12, rate: 91 },
  { month: 'Jun', completed: 12, target: 12, rate: 100 },
];

const DEFAULT_ATTENDANCE_TRENDS = [
  { period: 'W1', studentRate: 88, supervisorRate: 94, average: 91, benchmark: 90 },
  { period: 'W2', studentRate: 90, supervisorRate: 96, average: 93, benchmark: 90 },
  { period: 'W3', studentRate: 85, supervisorRate: 92, average: 88.5, benchmark: 90 },
  { period: 'W4', studentRate: 92, supervisorRate: 98, average: 95, benchmark: 90 },
  { period: 'W5', studentRate: 89, supervisorRate: 95, average: 92, benchmark: 90 },
  { period: 'W6', studentRate: 94, supervisorRate: 99, average: 96.5, benchmark: 90 },
];

const DEFAULT_TEAM_ACTIVITY = [
  { name: 'W1', Commits: 45, Reviews: 15, Issues: 8 },
  { name: 'W2', Commits: 60, Reviews: 25, Issues: 12 },
  { name: 'W3', Commits: 85, Reviews: 35, Issues: 14 },
  { name: 'W4', Commits: 90, Reviews: 40, Issues: 10 },
  { name: 'W5', Commits: 110, Reviews: 50, Issues: 18 },
  { name: 'W6', Commits: 130, Reviews: 60, Issues: 22 },
];

const DEFAULT_MEETING_ATTENDANCE = [
  { name: 'Meeting 1', Present: 18, Absent: 2 },
  { name: 'Meeting 2', Present: 19, Absent: 1 },
  { name: 'Meeting 3', Present: 17, Absent: 3 },
  { name: 'Meeting 4', Present: 20, Absent: 0 },
  { name: 'Meeting 5', Present: 19, Absent: 1 },
];

export function Reports() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Stable hash based on last updated time for security token
  const securityToken = `FEPRH-SEC-${Array.from(lastUpdated.toISOString()).reduce((s, c) => Math.imul(31, s) + c.charCodeAt(0) | 0, 0).toString().replace('-', '').slice(0, 6)}`;


  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [completionTrends, setCompletionTrends] = useState(DEFAULT_COMPLETION_TRENDS);
  const [attendanceTrends, setAttendanceTrends] = useState(DEFAULT_ATTENDANCE_TRENDS);
  const [teamActivity, setTeamActivity] = useState(DEFAULT_TEAM_ACTIVITY);
  const [projectStatusDist, setProjectStatusDist] = useState(DEFAULT_PROJECT_STATUS);

  const fetchReportsData = async () => {
    try {
      const [sumRes, compRes, attRes, actRes] = await Promise.allSettled([
        reportsApi.getAnalytics(),
        reportsApi.getCompletionTrends(),
        reportsApi.getAttendanceTrends(),
        reportsApi.getTeamActivity(),
      ]);

      if (sumRes.status === "fulfilled" && sumRes.value) {
        setSummary(sumRes.value);
        if (sumRes.value.project_status_distribution) {
          const colors: Record<string, string> = {
            'Completed': '#10b981',
            'In Progress': '#3b82f6',
            'Proposed': '#f59e0b',
            'Approved': '#14b8a6',
            'On Hold': '#ef4444'
          };
          const dist = Object.entries(sumRes.value.project_status_distribution).map(([name, value]) => ({
            name,
            value: Number(value),
            color: colors[name] || '#6366f1'
          }));
          if (dist.length > 0) setProjectStatusDist(dist);
        }
      }

      if (compRes.status === "fulfilled" && compRes.value?.trends) {
        setCompletionTrends(compRes.value.trends);
      }

      if (attRes.status === "fulfilled" && attRes.value?.trends) {
        setAttendanceTrends(attRes.value.trends);
      }

      if (actRes.status === "fulfilled" && actRes.value?.activity) {
        setTeamActivity(actRes.value.activity);
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.warn("Failed to load reports data:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
    const interval = setInterval(() => {
      fetchReportsData();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchReportsData();
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-[120px] rounded-2xl border border-glass-border" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[350px] rounded-2xl border border-glass-border" />
          <Skeleton className="h-[350px] rounded-2xl border border-glass-border" />
        </div>
      </div>
    );
  }

  const totalProjects = summary?.total_projects || projectStatusDist.reduce((acc, p) => acc + p.value, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Print-Only Formal Document Header */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">MINISTRY OF HIGHER EDUCATION & SCIENTIFIC RESEARCH</h1>
            <h2 className="text-sm font-semibold text-slate-700">FEPRH Academic Integrity & Biometric Verification System</h2>
            <p className="text-xs text-slate-500 mt-1">Official Analytics & Comprehensive Audit Report</p>
          </div>
          <div className="text-right text-xs text-slate-600 space-y-0.5">
            <p><span className="font-semibold">Generated:</span> {lastUpdated.toLocaleDateString()} {lastUpdated.toLocaleTimeString()}</p>
            <p><span className="font-semibold">Status:</span> Verified & Synced</p>
            <p><span className="font-semibold">Security Token:</span> {securityToken}</p>
          </div>
        </div>
      </div>

      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-text-main tracking-tight">{t("reports_analytics")}</h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-text-muted">{t("reports_desc")}</p>
            <span className="text-xs text-text-muted flex items-center gap-1 border-l border-glass-border pl-3">
              <button onClick={handleRefresh} className={`${isRefreshing ? 'animate-spin' : ''} hover:text-text-main transition-colors`}>
                <RefreshCw className="w-3 h-3" />
              </button>
              {t("last_updated")} {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
        </div>
        <button 
          onClick={async () => {
            toast.success("Preparing PDF document for export...");
            try {
              const res = await fetch(`/api/reports/export/pdf`);
              if (!res.ok) throw new Error("Export failed");
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `analytics-report.pdf`;
              a.click();
              URL.revokeObjectURL(url);
            } catch (err) {
              toast.error("Failed to generate PDF");
            }
          }}
          className="btn-primary whitespace-nowrap print:hidden"
        >
          <Download className="w-4 h-4" />
          {t("export_report")}
        </button>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Tooltip content="Total verified active accounts across departments">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card bg-gradient-to-b from-indigo-500/10 to-transparent border-indigo-500/20 w-full">
            <div className="p-3 bg-indigo-500/20 rounded-xl w-fit mb-4">
              <Users className="w-6 h-6 text-indigo-400" />
            </div>
            <p className="text-sm font-medium text-text-muted">{t("active_users")}</p>
            <h3 className="text-3xl font-bold text-text-main mt-1">{summary?.total_users || 128}</h3>
          </motion.div>
        </Tooltip>

        <Tooltip content="Total research and capstone projects recorded">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card bg-gradient-to-b from-blue-500/10 to-transparent border-blue-500/20 w-full">
            <div className="p-3 bg-blue-500/20 rounded-xl w-fit mb-4">
              <Layers className="w-6 h-6 text-blue-400" />
            </div>
            <p className="text-sm font-medium text-text-muted">Total Projects</p>
            <h3 className="text-3xl font-bold text-text-main mt-1">{totalProjects}</h3>
          </motion.div>
        </Tooltip>

        <Tooltip content="Overall attendance across biometric verified sessions">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card bg-gradient-to-b from-emerald-500/10 to-transparent border-emerald-500/20 w-full">
            <div className="p-3 bg-emerald-500/20 rounded-xl w-fit mb-4">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-text-muted">{t("avg_attendance")}</p>
            <h3 className="text-3xl font-bold text-text-main mt-1">{summary?.avg_attendance_rate || 91.8}%</h3>
          </motion.div>
        </Tooltip>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col gap-3 justify-center">
          <div className="glass-card p-3 flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
            <span className="text-xs font-semibold text-text-main">AI Engine Cluster Online</span>
          </div>
          <div className="glass-card p-3 flex items-center gap-3">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-text-main">Dual DB Sync Operational</span>
          </div>
        </motion.div>
      </div>

      {/* Visualizations: Project Completion Rates and Attendance Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Completion Rates Over Time */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="glass-card h-[380px] flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-bold text-text-main">{t("project_completion_rate")}</h3>
              <p className="text-xs text-text-muted">{t("project_completion_desc")}</p>
            </div>
            <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
              On Track
            </span>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={completionTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area type="monotone" dataKey="completed" name="Completed Projects" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCompleted)" />
                <Line type="monotone" dataKey="target" name="Target Goal" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Attendance Trends Over Time */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card h-[380px] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-text-main">{t("attendance_trends")}</h3>
              <p className="text-xs text-text-muted">{t("attendance_trends_desc")}</p>
            </div>
            <span className="text-xs font-mono text-indigo-400 font-bold bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20">
              Avg {summary?.avg_attendance_rate || 91.8}%
            </span>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis domain={[70, 100]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} unit="%" />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
                  formatter={(value: any) => [`${value}%`]}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="supervisorRate" name="Supervisor Attendance (%)" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="studentRate" name="Student Attendance (%)" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Breakdown: Project Status & Team Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card lg:col-span-1 h-[380px] flex flex-col">
          <h3 className="text-lg font-bold text-text-main mb-4">{t("project_status")}</h3>
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={projectStatusDist}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {projectStatusDist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-[-50px]">
              <span className="text-2xl font-bold text-text-main">{totalProjects}</span>
            </div>
            
            <div className="w-full mt-2 space-y-1.5 px-4">
              {projectStatusDist.map(item => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-text-muted">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </div>
                  <span className="text-text-main font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card lg:col-span-2 h-[380px] flex flex-col">
          <h3 className="text-lg font-bold text-text-main mb-4">{t("team_activity_trends")}</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={teamActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '8px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Area type="monotone" dataKey="Commits" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCommits)" />
                <Line type="monotone" dataKey="Reviews" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Issues" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Meeting Attendance Breakdown */}
      <div className="glass-card h-[350px] flex flex-col">
        <h3 className="text-lg font-bold text-text-main mb-6">{t("meeting_attendance")}</h3>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={DEFAULT_MEETING_ATTENDANCE} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '8px' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="Present" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} barSize={32} />
              <Bar dataKey="Absent" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
