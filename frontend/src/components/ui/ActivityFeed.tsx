import { useState } from "react";
import { 
  FolderGit2, 
  UserCheck, 
  Video, 
  Filter, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight 
} from "lucide-react";

export type ActivityType = "all" | "project" | "login" | "meeting";

export interface ActivityItem {
  id: string;
  type: "project" | "login" | "meeting";
  title: string;
  user: string;
  avatarColor?: string;
  timestamp: string;
  detail?: string;
  badge?: {
    label: string;
    variant: "emerald" | "indigo" | "amber" | "blue" | "purple";
  };
}

const INITIAL_ACTIVITIES: ActivityItem[] = [];

export function ActivityFeed() {
  const [filter, setFilter] = useState<ActivityType>("all");
  const [activities] = useState<ActivityItem[]>(INITIAL_ACTIVITIES);

  const filtered = activities.filter((act) => {
    if (filter === "all") return true;
    return act.type === filter;
  });

  const getBadgeStyle = (variant: ActivityItem["badge"] extends { variant: infer V } ? V : string) => {
    switch (variant) {
      case "emerald":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "indigo":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      case "amber":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "purple":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "blue":
      default:
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    }
  };

  const getTypeIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "project":
        return <FolderGit2 className="w-4 h-4 text-emerald-400" />;
      case "login":
        return <UserCheck className="w-4 h-4 text-blue-400" />;
      case "meeting":
        return <Video className="w-4 h-4 text-purple-400" />;
    }
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-glass-border">
        <div>
          <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
            Team Activity Feed
            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/30">
              Live Visibility
            </span>
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Real-time updates across project milestones, user logins, and completed meetings
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-surface/80 border border-glass-border rounded-xl">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
              filter === "all"
                ? "bg-accent text-text-main shadow-sm"
                : "text-text-muted hover:text-text-main"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("project")}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-all flex items-center gap-1 ${
              filter === "project"
                ? "bg-accent text-text-main shadow-sm"
                : "text-text-muted hover:text-text-main"
            }`}
          >
            <FolderGit2 className="w-3 h-3" />
            Projects
          </button>
          <button
            onClick={() => setFilter("login")}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-all flex items-center gap-1 ${
              filter === "login"
                ? "bg-accent text-text-main shadow-sm"
                : "text-text-muted hover:text-text-main"
            }`}
          >
            <UserCheck className="w-3 h-3" />
            Logins
          </button>
          <button
            onClick={() => setFilter("meeting")}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-all flex items-center gap-1 ${
              filter === "meeting"
                ? "bg-accent text-text-main shadow-sm"
                : "text-text-muted hover:text-text-main"
            }`}
          >
            <Video className="w-3 h-3" />
            Meetings
          </button>
        </div>
      </div>

      {/* Activity Timeline List */}
      <div className="relative border-l border-glass-border ml-3 space-y-6 pl-6 pr-2 py-2">
        {filtered.map((item) => (
          <div key={item.id} className="relative group">
            {/* Circle Node on Timeline */}
            <div className="absolute -left-[31px] top-1.5 p-1 rounded-full bg-[var(--card-bg)] border border-glass-border shadow-md z-10">
              {getTypeIcon(item.type)}
            </div>

            <div className="bg-surface/40 backdrop-blur-sm border border-glass-border rounded-xl p-4 transition-all duration-200 group-hover:bg-surface/70 group-hover:border-accent/30 group-hover:translate-x-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-text-main flex items-center gap-1.5">
                    {item.title}
                  </h4>
                </div>
                <span className="text-xs text-text-muted flex items-center gap-1 shrink-0">
                  <Clock className="w-3 h-3" />
                  {item.timestamp}
                </span>
              </div>

              <div className="text-xs text-text-muted flex flex-wrap items-center gap-2">
                <span className="font-medium text-text-main flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
                  {item.user}
                </span>
                {item.detail && (
                  <>
                    <span>•</span>
                    <span>{item.detail}</span>
                  </>
                )}
              </div>

              {item.badge && (
                <div className="mt-2.5 flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${getBadgeStyle(item.badge.variant)}`}>
                    {item.badge.label}
                  </span>
                  {item.type === "meeting" && (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3" /> Verified Complete
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="py-8 text-center text-text-muted text-sm">
            No recent activity found for this category.
          </div>
        )}
      </div>
    </div>
  );
}
