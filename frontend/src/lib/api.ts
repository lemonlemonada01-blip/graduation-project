/**
 * Unified API Client for Secure-FEPRH AI & Security Engine
 * Connects frontend Vite React to the FastAPI backend (http://127.0.0.1:8000)
 */

export const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || "http://127.0.0.1:8000";

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = "ApiError";
  }
}

export async function apiFetch<T = any>(endpoint: string, options: RequestInit & { signal?: AbortSignal } = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers as Record<string, string> || {}),
  };

  const token = localStorage.getItem("auth_token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // 30s timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  const signal = options.signal || controller.signal;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal,
    });
    clearTimeout(timeoutId);

    const isJson = res.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      const errorMsg = (typeof data === "object" && data?.detail) ? data.detail : (typeof data === "string" ? data : `HTTP ${res.status}`);
      throw new ApiError(errorMsg, res.status, data);
    }

    return data as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(
      err.message || "Unable to connect to AI Engine backend. Ensure backend is running on http://127.0.0.1:8000.",
      0
    );
  }
}

// ============================================================================
// Biometrics & 3D Motion Challenge API
// ============================================================================
export const biometricsApi = {
  getHealth: () => apiFetch<{ status: string; biometrics: string; plagiarism: string }>("/api/system/health"),

  getChallenge: () => 
    apiFetch<{ challenges: string[] }>("/api/biometrics/challenge/generate"),

  verifyStep: (challengeType: string, imageBase64: string) =>
    apiFetch<{ status: string; detail: string; angles?: { pitch: number; yaw: number; roll: number } }>(
      "/api/biometrics/challenge/verify_step",
      {
        method: "POST",
        body: JSON.stringify({
          challenge_type: challengeType,
          image_base64: imageBase64,
        }),
      }
    ),

  verifyCircular: (framesBase64: string[]) =>
    apiFetch<{ status: string; message: string; detail: string }>(
      "/api/biometrics/challenge/verify_circular",
      {
        method: "POST",
        body: JSON.stringify({
          frames_base64: framesBase64,
        }),
      }
    ),

  register: (studentId: string, imageBase64: string, livenessToken: string) =>
    apiFetch<{ status: string; message: string }>("/api/biometrics/register", {
      method: "POST",
      body: JSON.stringify({
        student_id: studentId,
        image_base64: imageBase64,
        liveness_token: livenessToken,
      }),
    }),

  authenticate: (studentId: string, imageBase64: string) =>
    apiFetch<{ authenticated: boolean; token: string; distance?: number; message?: string }>(
      "/api/biometrics/authenticate",
      {
        method: "POST",
        body: JSON.stringify({
          student_id: studentId,
          image_base64: imageBase64,
        }),
      }
    ),

  identify: (imageBase64: string) =>
    apiFetch<{ authenticated: boolean; student_id?: string; student_name?: string; distance?: number; message?: string }>(
      "/api/biometrics/identify",
      {
        method: "POST",
        body: JSON.stringify({ image_base64: imageBase64 }),
      }
    ),
};

// ============================================================================
// Plagiarism & Similarity Scanner API
// ============================================================================
export interface PlagiarismComparison {
  project: string;
  matched_file?: string;
  university?: string;
  similarity: string;
  type: string;
  status: "Safe" | "Moderate" | "FLAGGED";
  submitted_snippet?: string;
  matched_snippet?: string;
  file1?: string;
  file2?: string;
  loc_matched?: number;
}

export interface GitCommitInfo {
  sha: string;
  author: string;
  date: string;
  message: string;
}

export interface GitContributorInfo {
  name: string;
  commits_count: string;
}

export interface GitMetadata {
  repo_url: string;
  branch: string;
  commits: GitCommitInfo[];
  contributors: GitContributorInfo[];
  commit_sha: string;
}

export interface PlagiarismScanResult {
  status: string;
  id?: string;
  target?: string;
  project_name?: string;
  scan_type: string;
  overall_similarity: number;
  code_similarity: number;
  text_similarity: number;
  verdict: "SAFE" | "FLAGGED";
  threshold: number;
  comparisons: PlagiarismComparison[];
  logs?: string[];
  git_metadata?: GitMetadata;
  code_files_count?: number;
  text_files_count?: number;
  total_files?: number;
  total_loc?: number;
  languages_detected?: string[];
  timestamp: string;
}

export interface PlagiarismHistoryItem {
  id: string;
  project_name: string;
  scan_type: string;
  overall_similarity: number;
  code_similarity: number;
  text_similarity: number;
  verdict: "SAFE" | "FLAGGED";
  total_files: number;
  total_loc: number;
  timestamp: string;
}

export interface GitRepoScanPayload {
  repo_url: string;
  branch?: string;
  access_token?: string;
  project_name?: string;
  scan_type?: string;
}

export const plagiarismApi = {
  getProjects: () =>
    apiFetch<{ projects: Array<{ id: string; name: string; university: string }> }>("/api/plagiarism/projects"),

  checkProjectExists: (names: string[]) =>
    apiFetch<string[]>(`/api/plagiarism/projects/check?names=${encodeURIComponent(names.join(','))}`),

  runScan: (scanType: string, target?: string) =>
    apiFetch<PlagiarismScanResult>("/api/plagiarism/scan", {
      method: "POST",
      body: JSON.stringify({
        scan_type: scanType,
        target: target,
      }),
    }),

  uploadAndScan: (projectName: string, files: Array<{ file?: File; path?: string; content?: string }>, scanType = "project") => {
    const formData = new FormData();
    formData.append("project_name", projectName);
    formData.append("scan_type", scanType);
    files.forEach(f => {
      if (f.file) formData.append("files", f.file);
      else if (f.content && f.path) formData.append("files", new Blob([f.content]), f.path);
    });
    return apiFetch<PlagiarismScanResult>("/api/plagiarism/upload-scan", {
      method: "POST",
      body: formData,
    });
  },

  uploadAndScanStream: async (
    projectName: string,
    files: Array<{ file?: File; path?: string; content?: string }>,
    scanType = "Direct Upload Project Scan",
    onLog: (logText: string) => void,
    onComplete: (result: PlagiarismScanResult) => void,
    onError: (errorText: string) => void
  ) => {
    const url = `${API_BASE_URL}/api/plagiarism/upload-scan-stream`;
    const token = localStorage.getItem("auth_token");
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const formData = new FormData();
    formData.append("project_name", projectName);
    formData.append("scan_type", scanType);
    files.forEach(f => {
      if (f.file) formData.append("files", f.file);
      else if (f.content && f.path) formData.append("files", new Blob([f.content]), f.path);
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text();
        try {
          const parsed = JSON.parse(errText);
          throw new Error(parsed.detail || errText);
        } catch {
          throw new Error(errText || `HTTP error ${res.status}`);
        }
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No readable stream in response");

      const decoder = new TextDecoder();
      let buffer = "";
      let streamCompleted = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const block of lines) {
          const trimmed = block.trim();
          if (trimmed.startsWith("data:")) {
            const jsonStr = trimmed.replace(/^data:\s*/, "");
            try {
              const msg = JSON.parse(jsonStr);
              if (msg.type === "log" && msg.text) {
                onLog(msg.text);
              } else if (msg.type === "complete" && msg.result) {
                streamCompleted = true;
                onComplete(msg.result);
              } else if (msg.type === "error" && msg.message) {
                streamCompleted = true;
                onError(msg.message);
              }
            } catch (e) {
              console.error("SSE parse error", e, block);
            }
          }
        }
      }
      if (!streamCompleted) {
        onError("Stream ended unexpectedly. The backend may have encountered an error.");
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      onError(err?.message || "Streaming connection failed");
    }
  },

  scanGitRepo: (payload: GitRepoScanPayload) =>
    apiFetch<PlagiarismScanResult>("/api/plagiarism/git-scan", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  scanGitRepoStream: async (
    payload: GitRepoScanPayload,
    onLog: (logText: string) => void,
    onComplete: (result: PlagiarismScanResult) => void,
    onError: (errorText: string) => void
  ) => {
    const url = `${API_BASE_URL}/api/plagiarism/git-scan-stream`;
    const token = localStorage.getItem("auth_token");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        try {
          const parsed = JSON.parse(errText);
          throw new Error(parsed.detail || errText);
        } catch {
          throw new Error(errText || `HTTP error ${res.status}`);
        }
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No readable stream in response");

      const decoder = new TextDecoder();
      let buffer = "";
      let streamCompleted = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const block of lines) {
          const trimmed = block.trim();
          if (trimmed.startsWith("data:")) {
            const jsonStr = trimmed.replace(/^data:\s*/, "");
            try {
              const msg = JSON.parse(jsonStr);
              if (msg.type === "log" && msg.text) {
                onLog(msg.text);
              } else if (msg.type === "complete" && msg.result) {
                streamCompleted = true;
                onComplete(msg.result);
              } else if (msg.type === "error" && msg.message) {
                streamCompleted = true;
                onError(msg.message);
              }
            } catch (e) {
              console.error("SSE parse error", e, block);
            }
          }
        }
      }
      // Safety net: if stream ended without a complete/error event
      if (!streamCompleted) {
        onError("Stream ended unexpectedly. The backend may have encountered an error.");
      }
    } catch (err: any) {
      onError(err?.message || "Git Streaming connection failed");
    }
  },

  getHistory: () =>
    apiFetch<{ reports: PlagiarismHistoryItem[] }>("/api/plagiarism/history"),

  getHistoryDetail: (reportId: string) =>
    apiFetch<PlagiarismScanResult>(`/api/plagiarism/history/${reportId}`),

  deleteHistory: (reportId: string) =>
    apiFetch<{ status: string; message: string }>(`/api/plagiarism/history/${reportId}`, {
      method: "DELETE",
    }),
};

// ============================================================================
// Sessions & Academic Attendance API
// ============================================================================
export interface AcademicSessionData {
  id: string;
  courseCode: string;
  courseName: string;
  type: 'Lecture' | 'Lab' | 'Defense Committee' | 'Exam';
  room: string;
  date: string;
  timeRange: string;
  gracePeriod: number;
  enrolled: number;
  status: 'Upcoming' | 'Live Now' | 'Completed' | 'Cancelled';
}

export interface SessionRosterRecord {
  id: number;
  student_id: string;
  student_name: string;
  status: 'Present' | 'Late' | 'Absent';
  verification_method: string;
  confidence: string;
  timestamp: string;
}

export const sessionsApi = {
  getAll: () => apiFetch<{ sessions: AcademicSessionData[] }>("/api/sessions"),

  create: (session: Partial<AcademicSessionData> & { student_ids?: string[] }) =>
    apiFetch<{ status: string; message: string; session: AcademicSessionData }>("/api/sessions", {
      method: "POST",
      body: JSON.stringify({
        id: session.id,
        course_code: session.courseCode,
        course_name: session.courseName,
        session_type: session.type,
        room: session.room,
        date: session.date,
        time_range: session.timeRange,
        grace_period: session.gracePeriod,
        enrolled: session.enrolled,
        status: session.status,
        student_ids: session.student_ids,
      }),
    }),

  update: (id: string, updates: Partial<AcademicSessionData>) =>
    apiFetch<{ status: string; message: string }>(`/api/sessions/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        course_code: updates.courseCode,
        course_name: updates.courseName,
        session_type: updates.type,
        room: updates.room,
        date: updates.date,
        time_range: updates.timeRange,
        grace_period: updates.gracePeriod,
        status: updates.status,
      }),
    }),

  delete: (id: string) =>
    apiFetch<{ status: string; message: string }>(`/api/sessions/${id}`, {
      method: "DELETE",
    }),

  getRoster: (id: string) =>
    apiFetch<SessionRosterRecord[]>(`/api/sessions/${id}/roster`),

  clockIn: (sessionId: string, studentId: string, studentName?: string, method?: string, confidence?: string) =>
    apiFetch<{ status: string; message: string; record: SessionRosterRecord }>(`/api/sessions/${sessionId}/clockin`, {
      method: "POST",
      body: JSON.stringify({
        student_id: studentId,
        student_name: studentName,
        verification_method: method,
        confidence: confidence,
      }),
    }),

  getStats: () =>
    apiFetch<{ trend: Array<{ session: string; session_name: string; date: string; present: number; late: number; absent: number; total: number }> }>(
      "/api/sessions/stats"
    ),
};

// ============================================================================
// Users & RBAC API
// ============================================================================
export interface UserProfileData {
  id: number;
  name: string;
  email: string;
  role: string;
  uni: string;
  dept: string;
  status: string;
  created_at?: string;
}

export const usersApi = {
  getAll: (params?: { search?: string; role?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append("search", params.search);
    if (params?.role) q.append("role", params.role);
    if (params?.status) q.append("status", params.status);
    const queryString = q.toString();
    return apiFetch<{ users: UserProfileData[] }>(`/api/users${queryString ? `?${queryString}` : ""}`);
  },

  provision: (userData: {
    full_name: string;
    email: string;
    password: string;
    role: string;
    university?: string;
    department?: string;
    status?: string;
  }) =>
    apiFetch<{ id: number; full_name: string; email: string; role: string; status: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    }),

  create: (userData: {
    full_name: string;
    email: string;
    password: string;
    role: string;
    university?: string;
    department?: string;
    status?: string;
  }) =>
    apiFetch<{ id: number; full_name: string; email: string; role: string; status: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    }),

  update: (
    userId: number,
    updates: {
      full_name?: string;
      email?: string;
      role?: string;
      university?: string;
      department?: string;
      status?: string;
    }
  ) =>
    apiFetch<{ status: string; message: string; user: UserProfileData }>(`/api/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    }),

  updateStatus: (userId: number, status: string) =>
    apiFetch<{ status: string; user_id: number; new_status: string }>(`/api/users/${userId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  delete: (userId: number) =>
    apiFetch<{ status: string; message: string }>(`/api/users/${userId}`, {
      method: "DELETE",
    }),

  resetPassword: (userId: number) =>
    apiFetch<{ status: string; message: string; temp_password: string }>(`/api/users/${userId}/reset-password`, {
      method: "POST",
    }),

  getComments: (projectId: string) =>
    apiFetch<Array<{ id: number; project_id: string; user_id: number; content: string; created_at: string; author_name: string }>>(
      `/api/projects/${projectId}/comments`
    ),

  addComment: (projectId: string, userId: number, content: string) =>
    apiFetch(`/api/projects/${projectId}/comments`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId, content }),
    }),
};

// ============================================================================
// Teams API
// ============================================================================
export interface TeamMemberData {
  id?: number;
  team_id?: number;
  user_id?: number;
  name: string;
  email: string;
  role: string;
  phone?: string;
  initials?: string;
}

export interface TeamData {
  id: number;
  name: string;
  description: string;
  department: string;
  university: string;
  color_gradient?: string;
  leader_id?: number;
  members_count: number;
  members: TeamMemberData[];
}

export const teamsApi = {
  getAll: () => apiFetch<{ teams: TeamData[] }>("/api/teams"),

  getById: (id: number) => apiFetch<TeamData>(`/api/teams/${id}`),

  create: (data: {
    name: string;
    description?: string;
    department?: string;
    university?: string;
    color_gradient?: string;
    leader_id?: number;
    members?: Array<{ name: string; email: string; role_in_team: string; phone?: string }>;
  }) =>
    apiFetch<{ status: string; team_id: number; name: string }>("/api/teams", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<TeamData>) =>
    apiFetch<{ status: string; message: string }>(`/api/teams/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiFetch<{ status: string; message: string }>(`/api/teams/${id}`, {
      method: "DELETE",
    }),

  addMember: (teamId: number, member: { name: string; email: string; role_in_team: string; phone?: string; user_id?: number }) =>
    apiFetch<{ status: string; member_id: number }>(`/api/teams/${teamId}/members`, {
      method: "POST",
      body: JSON.stringify(member),
    }),

  removeMember: (teamId: number, memberId: number) =>
    apiFetch<{ status: string; message: string }>(`/api/teams/${teamId}/members/${memberId}`, {
      method: "DELETE",
    }),
};

// ============================================================================
// Meetings API
// ============================================================================
export interface MeetingAttendeeData {
  id?: number;
  meeting_id?: number;
  student_name: string;
  student_id: string;
  is_verified: boolean;
  verification_method?: string;
  confidence?: string;
  timestamp?: string;
}

export interface MeetingData {
  id: number;
  title: string;
  project_id?: string;
  session_id?: string;
  date: string;
  time_range: string;
  room: string;
  notes?: string;
  status: "verified" | "partial" | "unverified";
  attendees: MeetingAttendeeData[];
}

export const meetingsApi = {
  getAll: () => apiFetch<{ meetings: MeetingData[] }>("/api/meetings"),

  getById: (id: number) => apiFetch<MeetingData>(`/api/meetings/${id}`),

  create: (data: {
    title: string;
    project_id?: string;
    session_id?: string;
    date: string;
    time_range: string;
    room: string;
    notes?: string;
    status?: string;
    attendees?: Array<{ student_name: string; student_id?: string }>;
  }) =>
    apiFetch<{ status: string; meeting_id: number; title: string }>("/api/meetings", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<MeetingData>) =>
    apiFetch<{ status: string; message: string }>(`/api/meetings/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiFetch<{ status: string; message: string }>(`/api/meetings/${id}`, {
      method: "DELETE",
    }),

  verifyAttendee: (
    meetingId: number,
    payload: { student_name: string; student_id?: string; verification_method?: string; confidence?: string }
  ) =>
    apiFetch<{ status: string; message: string; meeting_status: string }>(`/api/meetings/${meetingId}/verify`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

// ============================================================================
// Projects & Tasks API
// ============================================================================
export interface ProjectTaskData {
  id: number;
  project_id: string;
  title: string;
  description: string;
  status: "To Do" | "In Progress" | "Under Review" | "Completed";
  priority: "Low" | "Medium" | "High";
  category?: string;
  assignee_name?: string;
  order_index?: number;
}

export interface ProjectDeliverableData {
  id: number;
  name: string;
  file_path: string;
  file_size?: string;
  file_type?: string;
  uploader_name?: string;
  uploaded_at?: string;
}

export interface ProjectItemData {
  id: string;
  title: string;
  abstract: string;
  domain: string;
  status: "Proposed" | "Approved" | "In Progress" | "Completed" | "Rejected";
  supervisor_name: string;
  department: string;
  university: string;
  academic_year: string;
  progress_percentage: number;
  tasks_count?: number;
  deliverables_count?: number;
  created_at?: string;
}

export interface ProjectDetailData extends ProjectItemData {
  tasks: ProjectTaskData[];
  deliverables: ProjectDeliverableData[];
  comments: Array<{
    id: number;
    user_id: number;
    content: string;
    created_at: string;
    author_name: string;
  }>;
}

export const projectsApi = {
  getAll: () => apiFetch<{ projects: ProjectItemData[] }>("/api/projects"),

  getDetail: (id: string) => apiFetch<ProjectDetailData>(`/api/projects/${id}`),

  create: (data: Partial<ProjectItemData>) =>
    apiFetch<{ status: string; project_id: string; title: string }>("/api/projects", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<ProjectItemData>) =>
    apiFetch<{ status: string; message: string }>(`/api/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  updateStatus: (id: string, status: string) =>
    apiFetch<{ status: string; project_id: string }>(`/api/projects/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  delete: (id: string) =>
    apiFetch<{ status: string; message: string }>(`/api/projects/${id}`, {
      method: "DELETE",
    }),

  getTasks: (projectId: string) =>
    apiFetch<ProjectTaskData[]>(`/api/projects/${projectId}/tasks`),

  createTask: (
    projectId: string,
    task: { title: string; description?: string; status?: string; priority?: string; category?: string; assignee_name?: string }
  ) =>
    apiFetch<{ status: string; task_id: number }>(`/api/projects/${projectId}/tasks`, {
      method: "POST",
      body: JSON.stringify(task),
    }),

  updateTask: (projectId: string, taskId: number, updates: Partial<ProjectTaskData>) =>
    apiFetch<{ status: string; message: string }>(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    }),

  deleteTask: (projectId: string, taskId: number) =>
    apiFetch<{ status: string; message: string }>(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: "DELETE",
    }),
};

// ============================================================================
// Settings & Preferences API
// ============================================================================
export interface UserSettingsResponse {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    department: string;
    university: string;
  };
  preferences: {
    theme: string;
    language: string;
    notif_plagiarism_alerts: boolean;
    notif_meeting_reminders: boolean;
    notif_project_updates: boolean;
  };
}

export const settingsApi = {
  getMe: () => apiFetch<UserSettingsResponse>("/api/settings/me"),

  updateMe: (preferences: Partial<UserSettingsResponse["preferences"]>) =>
    apiFetch<{ status: string; message: string }>("/api/settings/me", {
      method: "PUT",
      body: JSON.stringify(preferences),
    }),

  changePassword: (payload: { current_password: string; new_password: string; email?: string }) =>
    apiFetch<{ status: string; message: string }>("/api/settings/change-password", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getLogs: () =>
    apiFetch<{ logs: Array<{ id: number; action: string; details: string; user: string; ip: string; timestamp: string }> }>(
      "/api/settings/logs"
    ),
};

// ============================================================================
// Reports & Analytics API
// ============================================================================
export interface ReportsAnalyticsData {
  kpis: {
    total_projects: number;
    active_projects: number;
    completed_projects: number;
    total_meetings: number;
    verified_meetings: number;
    attendance_rate: string;
    total_users: number;
    total_teams: number;
    total_scans: number;
    avg_plagiarism_similarity: string;
  };
  domain_distribution: Array<{ domain: string; count: number; percentage: number }>;
}

export const reportsApi = {
  getAnalytics: () => apiFetch<ReportsAnalyticsData>("/api/reports/analytics"),

  getCompletionTrends: () =>
    apiFetch<{ monthly: Array<{ month: string; completed: number; target: number }> }>("/api/reports/completion-trends"),

  getAttendanceTrends: () =>
    apiFetch<{ trend: Array<{ name: string; Present: number; Late: number; Absent: number }> }>("/api/reports/attendance-trends"),

  getTeamActivity: () =>
    apiFetch<{ teams: Array<{ team: string; department: string; members: number; tasks_completed: number; status: string }> }>(
      "/api/reports/team-activity"
    ),
};

// ============================================================================
// Notifications API
// ============================================================================
export interface NotificationItem {
  id: number;
  title: string;
  description: string;
  type: string;
  read: boolean;
  link: string;
  time: string;
}

export const notificationsApi = {
  getAll: () => apiFetch<{ notifications: NotificationItem[]; unread_count: number }>("/api/notifications"),

  create: (data: { title: string; description: string; notif_type?: string; link_route?: string }) =>
    apiFetch<{ status: string; notification_id: number }>("/api/notifications", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  markRead: (id: number) =>
    apiFetch<{ status: string; message: string }>(`/api/notifications/${id}/read`, {
      method: "PATCH",
    }),

  markAllRead: () =>
    apiFetch<{ status: string; message: string }>("/api/notifications/read-all", {
      method: "POST",
    }),
};

// ============================================================================
// System Health & Analytics Summary
// ============================================================================
export interface AnalyticsSummary extends ReportsAnalyticsData {
  total_projects?: number;
  flagged_plagiarism_cases?: number;
  avg_attendance_rate?: number;
  project_status_distribution?: Record<string, number>;
}

export const systemHealthApi = {
  get: () => apiFetch<{ status: string; timestamp?: string }>("/api/system/health"),
};


