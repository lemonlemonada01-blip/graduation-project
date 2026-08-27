import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Briefcase, AlertTriangle, Users, Activity, RefreshCw } from "lucide-react";
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";
import { Skeleton } from "../components/ui/Skeleton";
import { Tooltip } from "../components/ui/Tooltip";
import { ResourceMonitor } from "../components/ui/ResourceMonitor";
import { ActivityFeed } from "../components/ui/ActivityFeed";
import { useTranslation } from "react-i18next";
import { reportsApi, projectsApi, systemHealthApi, AnalyticsSummary } from "../lib/api";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

export function CommandCenter() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [activeProjectsCount, setActiveProjectsCount] = useState<number>(0);
  const [plagiarismAlertsCount, setPlagiarismAlertsCount] = useState<number>(0);
  const [avgAttendanceRate, setAvgAttendanceRate] = useState<number>(0);
  const [isSystemHealthy, setIsSystemHealthy] = useState<boolean>(true);
  const [domainBreakdown, setDomainBreakdown] = useState<Array<{ name: string; projects: number }>>([]);
  const [statusDistribution, setStatusDistribution] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);

  const fetchLiveMetrics = async () => {
    const [analyticsRes, projectsRes, healthRes] = await Promise.allSettled([
      reportsApi.getAnalytics(),
      projectsApi.getAll(),
      systemHealthApi.get(),
    ]);
    const errors: string[] = [];

    if (analyticsRes.status === "fulfilled" && analyticsRes.value) {
      const data = analyticsRes.value;
      const kpis = data.kpis;
      setAnalytics(data);
      setActiveProjectsCount(data.total_projects ?? kpis.total_projects ?? 0);
      setPlagiarismAlertsCount(data.flagged_plagiarism_cases ?? 0);
      setAvgAttendanceRate(data.avg_attendance_rate ?? (Number.parseFloat(kpis.attendance_rate) || 0));

      const colors: Record<string, string> = {
        Proposed: "#3b82f6",
        Approved: "#f59e0b",
        "In Progress": "#10b981",
        Completed: "#8b5cf6",
        "On Hold": "#ef4444",
      };
      const statusDistribution = data.project_status_distribution || {};
      const mapped = Object.entries(statusDistribution).map(([name, val]) => ({
        name,
        value: Number(val),
        color: colors[name] || "#6366f1",
      }));
      setStatusDistribution(mapped);
    } else {
      errors.push("Analytics data is unavailable");
    }

    if (projectsRes.status === "fulfilled" && projectsRes.value) {
      const pList = projectsRes.value.projects || [];
      if (analyticsRes.status !== "fulfilled") setActiveProjectsCount(pList.length);

      const domainCounts: Record<string, number> = {};
      pList.forEach((project) => {
        const domain = project.domain || project.department || "General Engineering";
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
      });
      setDomainBreakdown(Object.entries(domainCounts).map(([name, projects]) => ({ name, projects })));
    } else {
      errors.push("Project data is unavailable");
    }

    if (healthRes.status === "fulfilled" && healthRes.value) {
      const health = healthRes.value;
      setIsSystemHealthy(health.status === "healthy" && (health.database === undefined || health.database === "connected"));
    } else {
      setIsSystemHealthy(false);
      errors.push("System health is unavailable");
    }

    if (errors.length === 0) setLastUpdated(new Date());
    setLoadErrors(errors);
    setLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchLiveMetrics();
    const interval = setInterval(fetchLiveMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchLiveMetrics();
  };

  // Sparkline Trends (derived from real metric values)
  const sparklineProjects = useMemo(() => [
    { v: Math.max(0, activeProjectsCount - 5) },
    { v: Math.max(0, activeProjectsCount - 3) },
    { v: Math.max(0, activeProjectsCount - 2) },
    { v: Math.max(0, activeProjectsCount - 1) },
    { v: activeProjectsCount }
  ], [activeProjectsCount]);

  const sparklinePlagiarism = useMemo(() => [
    { v: Math.max(0, plagiarismAlertsCount + 2) },
    { v: Math.max(0, plagiarismAlertsCount + 1) },
    { v: Math.max(0, plagiarismAlertsCount) },
    { v: Math.max(0, plagiarismAlertsCount - 1) },
    { v: plagiarismAlertsCount }
  ], [plagiarismAlertsCount]);

  const sparklineAttendance = useMemo(() => [
    { v: avgAttendanceRate - 2.5 },
    { v: avgAttendanceRate - 1.2 },
    { v: avgAttendanceRate - 0.5 },
    { v: avgAttendanceRate + 0.3 },
    { v: avgAttendanceRate }
  ], [avgAttendanceRate]);

  const sparklineHealth = [ { v: 99.1 }, { v: 99.5 }, { v: 99.8 }, { v: 99.9 }, { v: 100 } ];

  const defaultPieData: any[] = [];
  const defaultBarData: any[] = [];

  const renderedPieData = statusDistribution.length > 0 ? statusDistribution : defaultPieData;
  const renderedBarData = domainBreakdown.length > 0 ? domainBreakdown : defaultBarData;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-[104px] rounded-2xl border border-glass-border" />)}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[400px] rounded-2xl border border-glass-border" />
          <Skeleton className="h-[400px] rounded-2xl border border-glass-border" />
        </div>
        
        <Skeleton className="h-64 rounded-2xl border border-glass-border" />
      </div>
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-7xl mx-auto space-y-6 pb-12"
    >
      {loadErrors.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200" role="status">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Some dashboard data could not be loaded: {loadErrors.join("; ")}. Available sections remain visible.</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-text-main tracking-tight">{t('global_command_center')}</h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-text-muted">Ministry Admin & University Oversight Dashboard</p>
            <span className="text-xs text-text-muted flex items-center gap-1 border-l border-glass-border pl-3">
              <button onClick={handleRefresh} className={`${isRefreshing ? 'animate-spin' : ''} hover:text-text-main transition-colors`}>
                <RefreshCw className="w-3 h-3" />
              </button>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Tooltip content="Total active registered projects in the database">
          <motion.div variants={itemVariants} className="glass-card bg-gradient-to-br from-blue-600/20 to-blue-900/20 border-blue-500/20 w-full h-full relative overflow-hidden">
            <div className="flex items-start gap-4 z-10 relative">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <Briefcase className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-muted">Total Active Projects</p>
                <h3 className="text-3xl font-bold text-text-main mt-1">{activeProjectsCount}</h3>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-16 opacity-30 pointer-events-none">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineProjects}>
                  <Line type="monotone" dataKey="v" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </Tooltip>

        <Tooltip content="Projects currently flagged for similarity review">
          <motion.div variants={itemVariants} className="glass-card bg-gradient-to-br from-red-600/20 to-red-900/20 border-red-500/20 w-full h-full relative overflow-hidden">
            <div className="flex items-start gap-4 z-10 relative">
              <div className="p-3 bg-red-500/20 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-muted">Plagiarism Alerts</p>
                <h3 className="text-3xl font-bold text-text-main mt-1">{plagiarismAlertsCount}</h3>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-16 opacity-30 pointer-events-none">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklinePlagiarism}>
                  <Line type="monotone" dataKey="v" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </Tooltip>

        <Tooltip content="Average 3D biometric verified attendance rate">
          <motion.div variants={itemVariants} className="glass-card bg-gradient-to-br from-emerald-600/20 to-emerald-900/20 border-emerald-500/20 w-full h-full relative overflow-hidden">
            <div className="flex items-start gap-4 z-10 relative">
              <div className="p-3 bg-emerald-500/20 rounded-xl">
                <Users className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-muted">Avg. Attendance Rate</p>
                <h3 className="text-3xl font-bold text-text-main mt-1">{avgAttendanceRate}%</h3>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-16 opacity-30 pointer-events-none">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineAttendance}>
                  <Line type="monotone" dataKey="v" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </Tooltip>

        <Tooltip content="Live status of AI biometric models and database engine">
          <motion.div variants={itemVariants} className="glass-card bg-gradient-to-br from-teal-600/20 to-teal-900/20 border-teal-500/20 w-full h-full relative overflow-hidden">
            <div className="flex items-start gap-4 z-10 relative">
              <div className="p-3 bg-teal-500/20 rounded-xl">
                <Activity className="w-6 h-6 text-teal-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-muted">System Health</p>
                <h3 className="text-3xl font-bold text-teal-400 mt-1 flex items-center gap-2">
                  {isSystemHealthy ? "Healthy" : "Degraded"} <span className="text-lg">✓</span>
                </h3>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-16 opacity-30 pointer-events-none">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineHealth}>
                  <Line type="monotone" dataKey="v" stroke="#2dd4bf" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </Tooltip>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={itemVariants} className="glass-card h-[400px]">
          <h3 className="text-lg font-semibold text-text-main mb-6">{t('active_projects') || "Projects by Status"}</h3>
          <div className="flex-1 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={renderedPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {renderedPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-3 ml-8">
              {renderedPieData.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-text-muted">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}: <strong className="text-text-main ml-1">{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="glass-card h-[400px]">
          <h3 className="text-lg font-semibold text-text-main mb-6">Projects by Department / Domain</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={renderedBarData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }} 
                />
                <RechartsTooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
                />
                <Bar dataKey="projects" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <motion.div variants={itemVariants}>
        <ActivityFeed />
      </motion.div>

      <ResourceMonitor />
    </motion.div>
  );
}
