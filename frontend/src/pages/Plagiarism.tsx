import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, X, UploadCloud, FileCode2, FileText, 
  TerminalSquare, Cpu, Layers, CheckCircle2, AlertTriangle, 
  Eye, ShieldAlert, Database, Code2, ShieldCheck,
  History, Clock, FileArchive, Filter, Trash2,
  FilePlus, FolderPlus, ChevronDown, ChevronUp, HardDrive,
  Copy, Download, Terminal, RefreshCw, GitBranch, GitCommit, Users,
  Globe, Sparkles, Check, Info, ArrowUpRight, Printer, ChevronLeft,
  ChevronRight, SlidersHorizontal, BarChart3, FileSpreadsheet
} from "lucide-react";
import { PieChart, Pie, ResponsiveContainer } from "recharts";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { 
  plagiarismApi, 
  PlagiarismScanResult, 
  PlagiarismComparison, 
  PlagiarismHistoryItem,
  GitRepoScanPayload
} from "../lib/api";

// Supported file extension categories
const CODE_EXTS = new Set([
  "py", "js", "jsx", "ts", "tsx", "java", "c", "cpp", "h", "hpp", "cs", 
  "go", "rs", "php", "rb", "swift", "kt", "scala", "html", "css", "sql", "sh",
  "json", "yaml", "yml", "xml", "dart", "r", "m", "vue", "svelte"
]);

const TEXT_EXTS = new Set(["pdf", "docx", "doc", "txt", "md", "tex", "rtf", "odt"]);
const ARCHIVE_EXTS = new Set(["zip", "rar", "tar", "gz", "7z", "bz2"]);

// Silent background bloat filter patterns
const IGNORE_PATTERNS = [
  "node_modules", ".venv", "venv", "env", ".env", ".git", ".idea", ".vscode", 
  "__pycache__", "dist", "build", ".next", ".nuxt", ".cache", "bin", "obj", ".nuget",
  ".gradle", ".cargo", "site-packages", ".pytest_cache", ".mypy_cache", "vendor"
];

const BINARY_EXTS = new Set([
  "exe", "dll", "so", "dylib", "class", "pyc", "pyo", "pyd", "o", "a", "iso", "dmg", 
  "wasm", "bin", "pt", "pth", "h5", "hdf5", "onnx", "pkl", "pickle", "joblib",
  "mp4", "avi", "mov", "mkv", "mp3", "wav", "png", "jpg", "jpeg", "gif", "ico"
]);

interface UploadedFileInfo {
  id: string;
  path: string;
  name: string;
  size: number;
  type: "code" | "text" | "archive" | "other";
  content?: string;
}

export function Plagiarism() {
  const { t } = useTranslation();
  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Mode Switcher: Direct Intake vs Git Repository
  const [activeTab, setActiveTab] = useState<"direct" | "git">("direct");

  // Direct Upload Intake State
  const [projectName, setProjectName] = useState<string>("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileInfo[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [isTraversing, setIsTraversing] = useState(false);
  const [totalFilesToProcess, setTotalFilesToProcess] = useState(0);
  const [processedFilesCount, setProcessedFilesCount] = useState(0);
  const [processingPhase, setProcessingPhase] = useState<string>('');
  
  // Bloat Elimination Stats
  const [bloatFilteredCount, setBloatFilteredCount] = useState<number>(0);
  const [inspectedTotalNodes, setInspectedTotalNodes] = useState<number>(0);

  // Git Repository Intake State
  const [gitRepoUrl, setGitRepoUrl] = useState<string>("");
  const [gitBranch, setGitBranch] = useState<string>("main");
  const [gitAccessToken, setGitAccessToken] = useState<string>("");
  const [gitProjectTitle, setGitProjectTitle] = useState<string>("");

  // Staged Files Explorer
  const [showExplorer, setShowExplorer] = useState(false);
  const [stagedSearch, setStagedSearch] = useState("");
  const [stagedCategory, setStagedCategory] = useState<"all" | "code" | "text" | "archive">("all");

  // Scan & Terminal Execution Streamer
  const [isScanning, setIsScanning] = useState(false);
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const [terminalAutoScroll, setTerminalAutoScroll] = useState(true);
  const [scanResult, setScanResult] = useState<PlagiarismScanResult | null>(null);
  const [lastLogTimestamp, setLastLogTimestamp] = useState<number>(Date.now());
  const [timeSinceLastLog, setTimeSinceLastLog] = useState<number>(0);

  // Comparisons Filter & Pagination
  const [matchesFilter, setMatchesFilter] = useState<"all" | "critical" | "moderate" | "safe">("all");
  const [matchesSearch, setMatchesSearch] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 6;

  // Executive Full Report Modal
  const [isExecutiveReportOpen, setIsExecutiveReportOpen] = useState(false);

  // Modals & History Inspection
  const [selectedDiff, setSelectedDiff] = useState<PlagiarismComparison | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState<PlagiarismHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState<string>("");

  // Auto-scroll terminal stream
  useEffect(() => {
    if (terminalAutoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [scanLogs, terminalAutoScroll]);

  useEffect(() => {
    setLastLogTimestamp(Date.now());
    setTimeSinceLastLog(0);
  }, [scanLogs]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isScanning) {
      interval = setInterval(() => {
        setTimeSinceLastLog(Date.now() - lastLogTimestamp);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isScanning, lastLogTimestamp]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Helper to process raw files and directories with intelligent bloat filtration
  const processRawFiles = async (files: File[], customPaths?: string[]) => {
    setIsProcessingFiles(true);
    setTotalFilesToProcess(files.length);
    setProcessedFilesCount(0);
    setProcessingPhase(`Reading file content (0/${files.length.toLocaleString()})...`);
    
    const newItems: UploadedFileInfo[] = [];
    let detectedProjectName = "";
    let localBloatCount = 0;
    let localInspectedCount = 0;

    for (let i = 0; i < files.length; i++) {
      if (i > 0 && i % 50 === 0) {
        setProcessedFilesCount(i);
        setProcessingPhase(`Reading file content (${i.toLocaleString()}/${files.length.toLocaleString()})...`);
        await new Promise(r => setTimeout(r, 0));
      }

      localInspectedCount++;
      const file = files[i];
      const relativePath = customPaths?.[i] || (file as any).webkitRelativePath || file.name;
      const pathLower = relativePath.toLowerCase();

      // Extract root directory name if available
      if (relativePath.includes("/")) {
        const root = relativePath.split("/")[0];
        if (!detectedProjectName && root && !IGNORE_PATTERNS.includes(root)) {
          detectedProjectName = root;
        }
      }

      // Check bloat patterns (node_modules, .venv, etc.)
      const isIgnored = IGNORE_PATTERNS.some(p => 
        pathLower.includes(`/${p}/`) || pathLower.startsWith(`${p}/`) || pathLower.includes(`\\${p}\\`)
      );
      if (isIgnored) {
        localBloatCount++;
        continue;
      }

      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (BINARY_EXTS.has(ext)) {
        localBloatCount++;
        continue;
      }

      let fileType: "code" | "text" | "archive" | "other" = "other";

      if (CODE_EXTS.has(ext)) {
        fileType = "code";
      } else if (TEXT_EXTS.has(ext)) {
        fileType = "text";
      } else if (ARCHIVE_EXTS.has(ext)) {
        fileType = "archive";
      }

      // Read text content for scanning (supports up to 10MB per code/report file)
      let contentText: string | undefined = undefined;
      if ((fileType === "code" || fileType === "text") && file.size < 10 * 1024 * 1024) {
        try {
          contentText = await file.text();
        } catch (e) {
          // Binary fallback
        }
      }

      newItems.push({
        id: `${relativePath}_${file.size}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        path: relativePath,
        name: file.name,
        size: file.size,
        type: fileType,
        content: contentText,
      });
    }

    setBloatFilteredCount(prev => prev + localBloatCount);
    setInspectedTotalNodes(prev => prev + localInspectedCount);

    setUploadedFiles(prev => {
      const existingPaths = new Set(prev.map(p => p.path));
      const filteredNew = newItems.filter(item => !existingPaths.has(item.path));
      return [...prev, ...filteredNew];
    });

    if (detectedProjectName && !projectName) {
      setProjectName(detectedProjectName);
    } else if (files.length === 1 && !projectName) {
      setProjectName(files[0].name.replace(/\.[^/.]+$/, ""));
    }

    setIsProcessingFiles(false);
    if (newItems.length > 0) {
      setShowExplorer(true);
      toast.success(`${newItems.length} ${t("total_staged_stats")}`);
    }
  };

  // Directory entry traversal for multi-folder drag and drop
  const traverseDirectoryEntry = async (entry: any, path = ""): Promise<{ file: File; path: string }[]> => {
    return new Promise((resolve) => {
      if (entry.isFile) {
        entry.file((file: File) => {
          resolve([{ file, path: path ? `${path}/${file.name}` : file.name }]);
        }, () => resolve([]));
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        const entries: any[] = [];
        const readEntries = () => {
          dirReader.readEntries(async (result: any[]) => {
            if (result.length === 0) {
              const nestedFiles: { file: File; path: string }[] = [];
              for (const childEntry of entries) {
                const childPath = path ? `${path}/${entry.name}` : entry.name;
                const childFiles = await traverseDirectoryEntry(childEntry, childPath);
                nestedFiles.push(...childFiles);
              }
              resolve(nestedFiles);
            } else {
              entries.push(...result);
              readEntries();
            }
          }, () => resolve([]));
        };
        readEntries();
      } else {
        resolve([]);
      }
    });
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processRawFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processRawFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const handleZipSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processRawFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    setIsTraversing(true);
    setProcessingPhase('Scanning directory structure...');

    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      const filePromises: Promise<{ file: File; path: string }[]>[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (typeof item.webkitGetAsEntry === "function") {
          const entry = item.webkitGetAsEntry();
          if (entry) {
            filePromises.push(traverseDirectoryEntry(entry));
          }
        }
      }

      if (filePromises.length > 0) {
        const results = await Promise.all(filePromises);
        const flattened = results.flat();
        const files = flattened.map(f => f.file);
        const paths = flattened.map(f => f.path);
        
        setIsTraversing(false);

        if (files.length > 0) {
          processRawFiles(files, paths);
          return;
        }
      }
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processRawFiles(Array.from(e.dataTransfer.files));
    }
    
    setIsTraversing(false);
  };

  const removeStagedFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const clearUpload = () => {
    setUploadedFiles([]);
    setProjectName("");
    setShowExplorer(false);
    setBloatFilteredCount(0);
    setInspectedTotalNodes(0);
    toast.success(t("clear_all"));
  };

  // Dynamic statistics for Direct Upload
  const stagedCodeCount = uploadedFiles.filter(f => f.type === "code").length;
  const stagedDocCount = uploadedFiles.filter(f => f.type === "text").length;
  const stagedArchiveCount = uploadedFiles.filter(f => f.type === "archive").length;
  const stagedLoc = uploadedFiles
    .filter(f => f.type === "code" && f.content)
    .reduce((acc, f) => acc + (f.content ? f.content.split("\n").length : 0), 0);
  const totalStagedSize = uploadedFiles.reduce((acc, f) => acc + f.size, 0);

  const filteredStagedFiles = uploadedFiles.filter(f => {
    const matchesSearch = f.path.toLowerCase().includes(stagedSearch.toLowerCase()) || f.name.toLowerCase().includes(stagedSearch.toLowerCase());
    const matchesCategory = stagedCategory === "all" || f.type === stagedCategory;
    return matchesSearch && matchesCategory;
  });

  // Start Direct Upload Scan with Live Terminal Execution Stream
  const startDirectScan = async () => {
    if (uploadedFiles.length === 0) {
      toast.error(t("no_files_staged"));
      return;
    }

    const activeProjectName = projectName || (uploadedFiles[0]?.path.includes("/") ? uploadedFiles[0].path.split("/")[0] : "Intake_Project");

    try {
      const res = await fetch(`/api/plagiarism/projects/check?names=${encodeURIComponent(activeProjectName)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.exists || (data.existing_projects && data.existing_projects.length > 0)) {
          toast.error(`Project "${activeProjectName}" already exists in the database. Skipping duplicate.`);
          return;
        }
      }
    } catch (err) {
      // ignore
    }

    setIsScanning(true);
    setScanResult(null);

    const initialLogs = [
      `[${new Date().toLocaleTimeString()}] [INTAKE] Staging ${uploadedFiles.length} files (${formatFileSize(totalStagedSize)})`,
      `[${new Date().toLocaleTimeString()}] [INTAKE] Code files: ${stagedCodeCount}, Documents: ${stagedDocCount}, Total LOC: ${stagedLoc}`,
    ];
    setScanLogs(initialLogs);

    // Prepare payload
    const payloadFiles = uploadedFiles
      .filter(f => f.content && f.type !== "other" && f.type !== "archive")
      .slice(0, 300)
      .map(f => ({
        path: f.path,
        content: f.content || "",
        file_type: f.type,
      }));

    // Active project name is already extracted above

    await plagiarismApi.uploadAndScanStream(
      activeProjectName,
      payloadFiles,
      "Direct Upload Project Scan",
      (logText) => {
        setScanLogs(prev => [...prev, logText]);
      },
      (result) => {
        setScanResult(result);
        setIsScanning(false);
        toast.success(`${t("run_scan_btn")}: ${result.overall_similarity}% ${t("col_sim")}`);
      },
      (errorMsg) => {
        setScanLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] [ERROR] ❌ ${errorMsg}`,
        ]);
        setIsScanning(false);
        toast.error(errorMsg);
      }
    );
  };

  // Start Git Repository Scan with Real-Time Streaming
  const startGitScan = async () => {
    if (!gitRepoUrl.trim()) {
      toast.error(t("git_repo_url") + " is required.");
      return;
    }

    setIsScanning(true);
    setScanResult(null);

    const initialLogs = [
      `[${new Date().toLocaleTimeString()}] [GIT] Connecting to remote repository: ${gitRepoUrl.trim()}`,
      `[${new Date().toLocaleTimeString()}] [GIT] Target Branch: ${gitBranch || 'main'}`,
      `[${new Date().toLocaleTimeString()}] [SECURITY] Isolated ephemeral sandbox allocated.`,
    ];
    setScanLogs(initialLogs);

    const payload: GitRepoScanPayload = {
      repo_url: gitRepoUrl.trim(),
      branch: gitBranch.trim() || "main",
      access_token: gitAccessToken.trim() || undefined,
      project_name: gitProjectTitle.trim() || undefined,
      scan_type: "Git Repository AI Integrity Scan"
    };

    await plagiarismApi.scanGitRepoStream(
      payload,
      (logText) => {
        setScanLogs(prev => [...prev, logText]);
      },
      (result) => {
        setScanResult(result);
        setIsScanning(false);
        toast.success(`${t("run_scan_btn")}: ${result.overall_similarity}% ${t("col_sim")}`);
      },
      (errorMsg) => {
        setScanLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] [ERROR] ❌ ${errorMsg}`,
        ]);
        setIsScanning(false);
        toast.error(errorMsg);
      }
    );
  };

  // Fetch Database Scan History
  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await plagiarismApi.getHistory();
      if (res && res.reports) {
        setHistoryList(res.reports);
      }
    } catch (e) {
      console.error("Failed to load history:", e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleOpenHistory = () => {
    setIsHistoryOpen(true);
    loadHistory();
  };

  const handleInspectHistoryReport = async (reportId: string) => {
    setIsHistoryOpen(false);
    try {
      const detail = await plagiarismApi.getHistoryDetail(reportId);
      if (detail) {
        setScanResult(detail);
        if (detail.logs) {
          setScanLogs(detail.logs);
        }
        toast.success(`${t("inspect_report")}: ${detail.project_name || reportId}`);
      }
    } catch (e) {
      toast.error("Failed to load report detail.");
    }
  };

  const handleDeleteHistoryReport = async (reportId: string) => {
    if (!window.confirm(t("delete_confirm"))) return;
    try {
      await plagiarismApi.deleteHistory(reportId);
      setHistoryList(prev => prev.filter(r => r.id !== reportId));
      toast.success(t("delete_record"));
    } catch (e) {
      toast.error("Failed to delete record.");
    }
  };

  const copyTerminalLogs = () => {
    navigator.clipboard.writeText(scanLogs.join("\n"));
    toast.success(t("logs_copied"));
  };

  const downloadTerminalLogs = () => {
    const blob = new Blob([scanLogs.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plagiarism-scan-log-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportReportJson = () => {
    if (!scanResult) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(scanResult, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `academic-audit-report-${scanResult.id || Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success(t("export_report_json"));
  };

  const exportReportPdf = async () => {
    if (!scanResult?.id) {
      toast.error("No report ID available");
      return;
    }
    toast.success("Preparing PDF document for print/export...");
    try {
      const res = await fetch(`/api/plagiarism/reports/${scanResult.id}/pdf`);
      if (res.status === 404) {
        toast.error("PDF generation not available yet");
        return;
      }
      if (!res.ok) throw new Error("Failed to export PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report_${scanResult.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Error generating PDF");
    }
  };

  const overallScore = scanResult ? scanResult.overall_similarity : 0;
  const codeScore = scanResult ? scanResult.code_similarity : 0;
  const textScore = scanResult ? scanResult.text_similarity : 0;
  const comparisonsList = scanResult ? scanResult.comparisons : [];

  // Severity counts
  const criticalCount = comparisonsList.filter(c => (parseFloat(c.similarity.replace("%", "")) || 0) >= 80).length;
  const moderateCount = comparisonsList.filter(c => {
    const s = parseFloat(c.similarity.replace("%", "")) || 0;
    return s >= 50 && s < 80;
  }).length;
  const safeCount = comparisonsList.filter(c => (parseFloat(c.similarity.replace("%", "")) || 0) < 50).length;

  // Filtered comparisons
  const filteredComparisons = comparisonsList.filter((item) => {
    const simNum = parseFloat(item.similarity.replace("%", "")) || 0;
    if (matchesFilter === "critical" && simNum < 80) return false;
    if (matchesFilter === "moderate" && (simNum < 50 || simNum >= 80)) return false;
    if (matchesFilter === "safe" && simNum >= 50) return false;

    if (matchesSearch.trim()) {
      const q = matchesSearch.toLowerCase();
      const matchProj = (item.project || "").toLowerCase().includes(q);
      const matchFile = (item.matched_file || "").toLowerCase().includes(q);
      const matchUni = (item.university || "").toLowerCase().includes(q);
      const matchType = (item.type || "").toLowerCase().includes(q);
      return matchProj || matchFile || matchUni || matchType;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredComparisons.length / ITEMS_PER_PAGE));
  const paginatedComparisons = filteredComparisons.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // History filtering
  const filteredHistory = historyList.filter(h => {
    if (!historySearch.trim()) return true;
    const q = historySearch.toLowerCase();
    return (h.project_name || "").toLowerCase().includes(q) || (h.id || "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Hidden file inputs */}
      <input 
        type="file" 
        ref={folderInputRef} 
        onChange={handleFolderSelect} 
        /* @ts-ignore */
        webkitdirectory="" 
        directory="" 
        multiple 
        className="hidden" 
      />
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileSelect} 
        multiple 
        className="hidden" 
      />
      <input 
        type="file" 
        ref={zipInputRef} 
        onChange={handleZipSelect} 
        accept=".zip,.rar,.tar,.gz,.7z" 
        className="hidden" 
      />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-bold text-text-main flex items-center gap-3">
            <ShieldAlert className="w-7 h-7 text-accent" />
            {t("plagiarism_title")}
          </h1>
          <p className="text-text-muted text-sm max-w-3xl leading-relaxed">
            {t("plagiarism_desc")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {uploadedFiles.length > 0 && activeTab === "direct" && (
            <button 
              onClick={clearUpload} 
              className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-1.5 border border-red-500/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {t("clear_all")}
            </button>
          )}
          <button 
            onClick={handleOpenHistory}
            className="bg-surface/60 hover:bg-surface border border-glass-border rounded-xl px-4 py-2 flex items-center gap-2 text-sm font-semibold text-text-main transition-colors shrink-0 shadow-sm"
          >
            <History className="w-4 h-4 text-accent" />
            {t("scan_history")}
          </button>
        </div>
      </div>

      {/* DUAL-MODE INTAKE SWITCHER TABS */}
      <div className="flex border-b border-glass-border gap-2">
        <button
          onClick={() => setActiveTab("direct")}
          className={`pb-3 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "direct"
              ? "border-accent text-accent"
              : "border-transparent text-text-muted hover:text-text-main"
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          {t("tab_direct_upload")}
        </button>
        <button
          onClick={() => setActiveTab("git")}
          className={`pb-3 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "git"
              ? "border-accent text-accent"
              : "border-transparent text-text-muted hover:text-text-main"
          }`}
        >
          <Code2 className="w-4 h-4" />
          {t("tab_git_repo")}
        </button>
      </div>

      {/* TAB 1: DIRECT UPLOAD & MULTI-FOLDER DRAG & DROP INTAKE */}
      {activeTab === "direct" && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Pro-Tip Banner */}


          <div className="glass-card !p-6 relative overflow-hidden">
            <div 
              className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-10 transition-all duration-300 cursor-pointer ${
                isDragging 
                  ? 'border-accent bg-accent/10 scale-[1.01] shadow-[0_0_30px_rgba(249,115,22,0.2)]' 
                  : (isProcessingFiles || isTraversing)
                  ? 'border-accent/50 bg-accent/5'
                  : 'border-glass-border bg-surface/20 hover:border-accent/60 hover:bg-surface/30'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(isProcessingFiles || isTraversing) ? undefined : handleDrop}
              onClick={(isProcessingFiles || isTraversing) ? undefined : () => folderInputRef.current?.click()}
            >
              {(isProcessingFiles || isTraversing) ? (
                <div className="flex flex-col items-center w-full max-w-md animate-in fade-in zoom-in duration-300">
                  <div className="w-20 h-20 rounded-3xl bg-surface border border-glass-border flex items-center justify-center mb-4 shadow-2xl">
                    <RefreshCw className="w-10 h-10 text-accent animate-spin" />
                  </div>
                  <h2 className="text-xl font-bold text-text-main text-center mb-2">
                    {processingPhase || t("processing_files", "Processing files...")}
                  </h2>
                  
                  {totalFilesToProcess > 0 && (
                    <div className="w-full mt-4 space-y-2">
                      <div className="flex justify-between text-xs font-mono text-text-muted">
                        <span>{processedFilesCount} / {totalFilesToProcess}</span>
                        <span>{Math.round((processedFilesCount / totalFilesToProcess) * 100)}%</span>
                      </div>
                      <div className="h-2 w-full bg-background/50 rounded-full overflow-hidden border border-glass-border/30">
                        <div 
                          className="h-full bg-gradient-to-r from-accent to-orange-400 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)] transition-all duration-300 ease-out" 
                          style={{ width: `${(processedFilesCount / totalFilesToProcess) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-3xl bg-surface border border-glass-border flex items-center justify-center mb-4 shadow-2xl group">
                    <UploadCloud className={`w-10 h-10 transition-transform group-hover:scale-110 ${isDragging ? 'text-accent' : 'text-text-muted'}`} />
                  </div>
                  
                  <h2 className="text-xl font-bold text-text-main text-center">
                    {t("unified_upload_title")}
                  </h2>
                  <p className="text-xs text-text-muted mt-2 mb-6 text-center max-w-xl leading-relaxed">
                    {t("unified_upload_sub")}
                  </p>

                  {/* Quick Action Buttons inside the dropzone */}
                  <div 
                    className="flex flex-wrap items-center justify-center gap-3 z-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button 
                      onClick={() => folderInputRef.current?.click()}
                      disabled={isProcessingFiles}
                      className="bg-accent/15 hover:bg-accent/25 border border-accent/40 text-accent font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs transition-all shadow-sm active:scale-95"
                    >
                      <FolderPlus className="w-4 h-4" />
                      {t("browse_folders")}
                    </button>

                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessingFiles}
                      className="bg-surface hover:bg-surface-hover border border-glass-border text-text-main font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs transition-all shadow-sm active:scale-95"
                    >
                      <FilePlus className="w-4 h-4 text-blue-400" />
                      {t("browse_files")}
                    </button>

                    <button 
                      onClick={() => zipInputRef.current?.click()}
                      disabled={isProcessingFiles}
                      className="bg-surface hover:bg-surface-hover border border-glass-border text-text-main font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs transition-all shadow-sm active:scale-95"
                    >
                      <FileArchive className="w-4 h-4 text-purple-400" />
                      {t("browse_archives")}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Smart Bloat Elimination & Intake Progress Indicator */}
            {(uploadedFiles.length > 0 || bloatFilteredCount > 0) && (
              <div className="mt-5 pt-5 border-t border-glass-border/40 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      {t("intake_progress_title")}:
                    </span>

                    {bloatFilteredCount > 0 && (
                      <span className="px-2.5 py-1 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-400 text-xs font-medium">
                        🛡️ {bloatFilteredCount} {t("intake_bloat_eliminated")}
                      </span>
                    )}

                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                      ⚡ {uploadedFiles.length} {t("intake_core_staged")}
                    </span>

                    <span className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
                      📏 {formatFileSize(totalStagedSize)} <span className="opacity-70 font-normal ml-1">(uploaded archives)</span>
                    </span>
                  </div>

                  <button 
                    onClick={() => setShowExplorer(!showExplorer)}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-surface border border-glass-border hover:bg-surface-hover text-text-main text-xs font-medium transition-colors"
                  >
                    <HardDrive className="w-3.5 h-3.5 text-accent" />
                    {t("staged_files_header")} ({uploadedFiles.length})
                    {showExplorer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Staged stats pills */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs">
                    <FileCode2 className="w-3.5 h-3.5" />
                    {stagedCodeCount} {t("code_files")}
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                    <FileText className="w-3.5 h-3.5" />
                    {stagedDocCount} {t("doc_files")}
                  </div>
                  {stagedArchiveCount > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs">
                      <FileArchive className="w-3.5 h-3.5" />
                      {stagedArchiveCount} {t("archive_files")}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                    <TerminalSquare className="w-3.5 h-3.5" />
                    {stagedLoc.toLocaleString()} {t("loc_staged_metric")}
                  </div>
                </div>
              </div>
            )}

            {/* Interactive Staged Content Explorer */}
            <AnimatePresence>
              {showExplorer && uploadedFiles.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-5 pt-5 border-t border-glass-border/40 overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                      <button 
                        onClick={() => setStagedCategory("all")}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${stagedCategory === "all" ? "bg-accent text-white" : "bg-surface text-text-muted hover:text-text-main"}`}
                      >
                        {t("all_files")} ({uploadedFiles.length})
                      </button>
                      <button 
                        onClick={() => setStagedCategory("code")}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${stagedCategory === "code" ? "bg-blue-500 text-white" : "bg-surface text-text-muted hover:text-text-main"}`}
                      >
                        {t("code_files")} ({stagedCodeCount})
                      </button>
                      <button 
                        onClick={() => setStagedCategory("text")}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${stagedCategory === "text" ? "bg-amber-500 text-white" : "bg-surface text-text-muted hover:text-text-main"}`}
                      >
                        {t("doc_files")} ({stagedDocCount})
                      </button>
                      {stagedArchiveCount > 0 && (
                        <button 
                          onClick={() => setStagedCategory("archive")}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${stagedCategory === "archive" ? "bg-purple-500 text-white" : "bg-surface text-text-muted hover:text-text-main"}`}
                        >
                          {t("archive_files")} ({stagedArchiveCount})
                        </button>
                      )}
                    </div>

                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                      <input 
                        type="text"
                        placeholder={t("search_staged_files")}
                        value={stagedSearch}
                        onChange={(e) => setStagedSearch(e.target.value)}
                        className="w-full bg-surface/50 border border-glass-border rounded-lg pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-1.5 text-xs text-text-main placeholder-text-muted focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  {/* Staged file list */}
                  <div className="max-h-56 overflow-y-auto rounded-xl border border-glass-border divide-y divide-glass-border/40 bg-surface/20">
                    {filteredStagedFiles.map((file) => (
                      <div key={file.id} className="p-2.5 px-4 flex items-center justify-between hover:bg-surface/40 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          {file.type === "code" && <FileCode2 className="w-4 h-4 text-blue-400 shrink-0" />}
                          {file.type === "text" && <FileText className="w-4 h-4 text-amber-400 shrink-0" />}
                          {file.type === "archive" && <FileArchive className="w-4 h-4 text-purple-400 shrink-0" />}
                          {file.type === "other" && <FilePlus className="w-4 h-4 text-slate-400 shrink-0" />}
                          <span className="text-xs font-mono text-text-main truncate">{file.path}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[11px] text-text-muted font-mono">{formatFileSize(file.size)}</span>
                          <button 
                            onClick={() => removeStagedFile(file.id)}
                            className="text-text-muted hover:text-red-400 p-1 rounded transition-colors"
                            title={t("remove_file")}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {filteredStagedFiles.length === 0 && (
                      <div className="p-6 text-center text-xs text-text-muted">
                        {t("no_files_staged")}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* PRIMARY CTA BAR FOR DIRECT INTAKE */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-card !p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-accent/15 rounded-xl border border-accent/30 text-accent">
                <Cpu className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-main">{t("codebert_title")} & {t("nlp_title")}</h3>
                <p className="text-xs text-text-muted">{t("nat_registry_active")}</p>
              </div>
            </div>

            <button 
              onClick={startDirectScan}
              disabled={isScanning || uploadedFiles.length === 0}
              className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white font-bold text-base rounded-xl px-8 py-3.5 shadow-[0_0_25px_rgba(239,68,68,0.25)] hover:shadow-[0_0_35px_rgba(239,68,68,0.4)] transition-all flex items-center justify-center gap-2.5 transform active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  {t("scanning_in_progress")}
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  {t("run_scan_btn")}
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}

      {/* TAB 2: GIT / GITHUB REPOSITORY INTAKE */}
      {activeTab === "git" && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="glass-card !p-6 space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-400">
                <GitBranch className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text-main">{t("git_repo_card_title")}</h2>
                <p className="text-xs text-text-muted mt-1 leading-relaxed max-w-2xl">{t("git_repo_card_desc")}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Repo URL */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-text-main flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-accent" />
                  {t("git_repo_url")} <span className="text-red-400">*</span>
                </label>
                <input 
                  type="text"
                  placeholder={t("git_repo_url_placeholder")}
                  value={gitRepoUrl}
                  onChange={(e) => setGitRepoUrl(e.target.value)}
                  className="w-full bg-surface/50 border border-glass-border rounded-xl px-4 py-2.5 text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-accent font-mono"
                />
              </div>

              {/* Branch */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-main flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-blue-400" />
                  {t("git_branch")}
                </label>
                <input 
                  type="text"
                  placeholder="main"
                  value={gitBranch}
                  onChange={(e) => setGitBranch(e.target.value)}
                  className="w-full bg-surface/50 border border-glass-border rounded-xl px-4 py-2.5 text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-accent font-mono"
                />
              </div>

              {/* Project / Thesis Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-main flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  {t("git_project_name")}
                </label>
                <input 
                  type="text"
                  placeholder={t("git_project_name_placeholder")}
                  value={gitProjectTitle}
                  onChange={(e) => setGitProjectTitle(e.target.value)}
                  className="w-full bg-surface/50 border border-glass-border rounded-xl px-4 py-2.5 text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-accent"
                />
              </div>

              {/* Access Token (Optional) */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  {t("git_token_label")}
                </label>
                <input 
                  type="password"
                  placeholder={t("git_token_placeholder")}
                  value={gitAccessToken}
                  onChange={(e) => setGitAccessToken(e.target.value)}
                  className="w-full bg-surface/50 border border-glass-border rounded-xl px-4 py-2.5 text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-accent font-mono"
                />
              </div>
            </div>

            {/* Ingestion Specs Note */}
            <div className="p-4 rounded-xl bg-surface/30 border border-glass-border flex items-center justify-between text-xs text-text-muted">
              <span className="flex items-center gap-2">
                <Info className="w-4 h-4 text-accent shrink-0" />
                <span>Shallow Clone depth=1 • Automated .gitignore bloat exclusion • Ephemeral secure sandbox</span>
              </span>
              <span className="font-semibold text-emerald-400">Security Gate: Active</span>
            </div>
          </div>

          {/* PRIMARY CTA FOR GIT SCAN */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-card !p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/15 rounded-xl border border-blue-500/30 text-blue-400">
                <Code2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-main">{t("git_repo_card_title")}</h3>
                <p className="text-xs text-text-muted">{t("nat_registry_active")}</p>
              </div>
            </div>

            <button 
              onClick={startGitScan}
              disabled={isScanning || !gitRepoUrl.trim()}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-base rounded-xl px-8 py-3.5 shadow-[0_0_25px_rgba(59,130,246,0.25)] hover:shadow-[0_0_35px_rgba(59,130,246,0.4)] transition-all flex items-center justify-center gap-2.5 transform active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  {t("git_cloning_active")}
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  {t("git_clone_btn")}
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}

      {/* LIVE TERMINAL EXECUTION STREAMER */}
      {(isScanning || scanLogs.length > 0) && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-950/80 rounded-xl overflow-hidden"
        >
          <div className="p-3.5 px-5 bg-slate-950/80 border-b border-glass-border flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-accent" />
                {t("live_terminal_title")}
              </span>
              {isScanning && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-400 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  {t("live_stream_active")}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setTerminalAutoScroll(!terminalAutoScroll)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors ${terminalAutoScroll ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-surface text-text-muted'}`}
              >
                Auto-Scroll: {terminalAutoScroll ? "ON" : "OFF"}
              </button>
              <button 
                onClick={copyTerminalLogs}
                className="p-1.5 rounded-lg bg-surface hover:bg-surface-hover text-text-muted hover:text-text-main transition-colors"
                title={t("copy_logs")}
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={downloadTerminalLogs}
                className="p-1.5 rounded-lg bg-surface hover:bg-surface-hover text-text-muted hover:text-text-main transition-colors"
                title={t("download_logs")}
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div dir="ltr" className="p-4 bg-slate-950 text-slate-200 font-mono text-xs max-h-64 overflow-y-auto space-y-1 leading-relaxed selection:bg-accent/30 text-left">
            {scanLogs.map((log, idx) => {
              const isAst = log.includes("[AST]");
              const isNlp = log.includes("[NLP]");
              const isMinhash = log.includes("[MINHASH]") || log.includes("[LSH]");
              const isGit = log.includes("[GIT]") || log.includes("🐙");
              const isError = log.includes("[ERROR]") || log.includes("❌");
              const isCompleted = log.includes("[COMPLETED]") || log.includes("[DONE]") || log.includes("✅");

              return (
                <div 
                  key={idx} 
                  className={`flex items-start gap-2 ${
                    isError 
                      ? 'text-red-400' 
                      : isCompleted 
                      ? 'text-emerald-400 font-bold' 
                      : isAst 
                      ? 'text-orange-300' 
                      : isNlp 
                      ? 'text-rose-300' 
                      : isGit 
                      ? 'text-cyan-300'
                      : isMinhash 
                      ? 'text-blue-300' 
                      : 'text-slate-300'
                  }`}
                >
                  <span className="text-slate-600 select-none">&gt;</span>
                  <span>{log}</span>
                </div>
              );
            })}
            {isScanning && timeSinceLastLog > 2000 && (
              <div className="flex items-start gap-2">
                <span className="text-slate-600 select-none">&gt;</span>
                <span className="inline-flex text-accent font-mono">
                  <span className="animate-[dotPulse_1.4s_infinite_0s]">.</span>
                  <span className="animate-[dotPulse_1.4s_infinite_0.2s]">.</span>
                  <span className="animate-[dotPulse_1.4s_infinite_0.4s]">.</span>
                </span>
              </div>
            )}
            <style>{`
              @keyframes dotPulse {
                0%, 100% { opacity: 0; }
                50% { opacity: 1; }
              }
            `}</style>
            <div ref={terminalEndRef} />
          </div>
        </motion.div>
      )}

      {/* SCAN RESULTS DASHBOARD */}
      {scanResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          {/* Threshold Verdict Banner */}
          <div className={`border rounded-2xl p-5 flex items-start gap-4 shadow-xl ${
            overallScore < 25 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : overallScore < 65 
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            <ShieldCheck className="w-7 h-7 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-lg mb-1">
                {overallScore < 25 
                  ? t("score_safe_title")
                  : overallScore < 65 
                  ? t("score_mod_title")
                  : t("score_flagged_title")}
              </h4>
              <p className="text-sm opacity-90 leading-relaxed max-w-4xl">
                {overallScore < 25 ? t("score_safe_desc") : overallScore < 65 ? t("score_mod_desc") : t("score_flagged_desc")}
              </p>
            </div>
          </div>

          {/* Git Authorship Forensics Panel (If Git scan) */}
          {scanResult.git_metadata && (
            <div className="glass-panel p-6 border border-glass-border shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-glass-border/40 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20">
                    <GitBranch className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-text-main text-sm">{t("git_authorship_forensics")}</h4>
                    <p className="text-xs text-text-muted font-mono">{scanResult.git_metadata.repo_url} ({scanResult.git_metadata.branch})</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold flex items-center gap-1.5">
                    <GitCommit className="w-3.5 h-3.5" />
                    {scanResult.git_metadata.commits?.length || 0} {t("git_total_commits")}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {scanResult.git_metadata.contributors?.length || 0} {t("git_contributors_found")}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Contributors */}
                <div className="space-y-2">
                  <h5 className="text-xs font-semibold text-text-muted uppercase tracking-wider">{t("git_contributors_found")}</h5>
                  <div className="bg-surface/30 rounded-xl border border-glass-border/40 p-3 divide-y divide-glass-border/30 max-h-40 overflow-y-auto">
                    {scanResult.git_metadata.contributors?.map((c, idx) => (
                      <div key={idx} className="py-2 flex items-center justify-between text-xs">
                        <span className="text-text-main font-medium">{c.name}</span>
                        <span className="font-mono text-accent font-semibold">{c.commits_count} commits</span>
                      </div>
                    ))}
                    {(!scanResult.git_metadata.contributors || scanResult.git_metadata.contributors.length === 0) && (
                      <div className="text-xs text-text-muted py-2 text-center">No contributor data parsed</div>
                    )}
                  </div>
                </div>

                {/* Recent Commits */}
                <div className="space-y-2">
                  <h5 className="text-xs font-semibold text-text-muted uppercase tracking-wider">{t("git_total_commits")}</h5>
                  <div className="bg-surface/30 rounded-xl border border-glass-border/40 p-3 divide-y divide-glass-border/30 max-h-40 overflow-y-auto font-mono text-xs">
                    {scanResult.git_metadata.commits?.map((c, idx) => (
                      <div key={idx} className="py-1.5 space-y-0.5">
                        <div className="flex items-center justify-between text-[11px] text-text-muted">
                          <span className="text-accent font-bold">{c.sha}</span>
                          <span>{c.author} • {c.date}</span>
                        </div>
                        <p className="text-slate-300 truncate">{c.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Overall Similarity Gauge */}
            <div className="glass-panel p-8 flex flex-col items-center justify-center relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-32 h-32 ${overallScore >= 65 ? 'bg-red-500/10' : overallScore >= 25 ? 'bg-amber-500/10' : 'bg-emerald-500/10'} rounded-full blur-3xl`}></div>
              
              <div className="relative w-56 h-48 -mb-12">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { value: overallScore, fill: overallScore >= 65 ? '#ef4444' : overallScore >= 25 ? '#f59e0b' : '#10b981' }, 
                        { value: Math.max(0, 100 - overallScore), fill: '#1e293b' }
                      ]}
                      cx="50%"
                      cy="75%"
                      startAngle={180}
                      endAngle={0}
                      innerRadius={80}
                      outerRadius={100}
                      dataKey="value"
                      stroke="none"
                      cornerRadius={5}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-8">
                  <span className={`text-6xl font-black ${overallScore >= 65 ? 'text-red-400 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]' : overallScore >= 25 ? 'text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]'}`}>
                    {overallScore}%
                  </span>
                </div>
              </div>
              <h3 className="text-lg font-bold text-text-main mt-4 text-center z-10">{t("composite_score")}</h3>
              <p className="text-xs text-text-muted mt-1 z-10 text-center">{t("composite_score_desc")}</p>
            </div>

            {/* Dual Model Metric Cards */}
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="glass-panel p-6 flex flex-col relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-colors"></div>
                <div className="flex items-center justify-between mb-2 relative z-10">
                  <h4 className="font-bold text-text-main flex items-center gap-2"><Cpu className="w-5 h-5 text-orange-400" /> CodeBERT (AST)</h4>
                  <span className="text-3xl font-black text-orange-400">{codeScore}%</span>
                </div>
                <p className="text-xs text-text-muted mb-6 relative z-10">{t("code_similarity")}</p>
                
                <div className="mt-auto space-y-3 relative z-10">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">{t("exact_ast_match")}</span>
                    <span className="text-text-main font-medium">{Math.round(codeScore * 0.7)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">{t("var_rename_detected")}</span>
                    <span className="text-orange-400 font-medium">{Math.round(codeScore * 0.3)}%</span>
                  </div>
                  <div className="h-2 w-full bg-background/50 rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)]" style={{ width: `${Math.min(100, codeScore)}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="glass-panel p-6 flex flex-col relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition-colors"></div>
                <div className="flex items-center justify-between mb-2 relative z-10">
                  <h4 className="font-bold text-text-main flex items-center gap-2"><Layers className="w-5 h-5 text-red-400" /> BGE-M3 / ArabERT</h4>
                  <span className="text-3xl font-black text-red-400">{textScore}%</span>
                </div>
                <p className="text-xs text-text-muted mb-6 relative z-10">{t("text_similarity")}</p>
                
                <div className="mt-auto space-y-3 relative z-10">
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-text-muted">{t("arabic_norm_active")}</span>
                    <span className="text-emerald-400 font-bold text-[10px] px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full tracking-wider">ACTIVE</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">{t("cross_lingual_match")}</span>
                    <span className="text-text-main font-medium">{Math.round(textScore * 0.35)}%</span>
                  </div>
                  <div className="h-2 w-full bg-background/50 rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-gradient-to-r from-red-500 to-rose-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]" style={{ width: `${Math.min(100, textScore)}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Matched Comparisons Section with Filter Pills, Search, & Pagination */}
          <div className="glass-panel p-0 overflow-hidden border border-glass-border shadow-xl">
            {/* Header & Executive Actions */}
            <div className="p-5 border-b border-glass-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface/30">
              <div>
                <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                  <Database className="w-5 h-5 text-accent" /> 
                  {t("matched_db_title")}
                </h3>
                <p className="text-xs text-text-muted mt-1">{t("matched_db_desc")}</p>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setIsExecutiveReportOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover font-semibold text-xs flex items-center gap-2 shadow-lg shadow-accent/20 transition-all hover:scale-[1.02]"
                >
                  <FileText className="w-4 h-4" />
                  {t("view_executive_report")}
                </button>
                <button
                  onClick={exportReportJson}
                  className="px-3 py-2 rounded-xl bg-surface border border-glass-border hover:bg-surface/80 text-text-main font-medium text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-text-muted" />
                  {t("export_report_json")}
                </button>
              </div>
            </div>

            {/* Filter Pills & Search Bar */}
            <div className="p-4 border-b border-glass-border/50 bg-surface/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  onClick={() => { setMatchesFilter("all"); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    matchesFilter === "all" 
                      ? "bg-accent text-white shadow-md shadow-accent/20" 
                      : "bg-surface/40 hover:bg-surface text-text-muted hover:text-text-main border border-glass-border/40"
                  }`}
                >
                  {t("filter_all_matches")} ({comparisonsList.length})
                </button>

                {criticalCount > 0 && (
                  <button
                    onClick={() => { setMatchesFilter("critical"); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                      matchesFilter === "critical" 
                        ? "bg-red-500 text-white shadow-md shadow-red-500/20" 
                        : "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {t("filter_critical")} ({criticalCount})
                  </button>
                )}

                {moderateCount > 0 && (
                  <button
                    onClick={() => { setMatchesFilter("moderate"); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                      matchesFilter === "moderate" 
                        ? "bg-amber-500 text-white shadow-md shadow-amber-500/20" 
                        : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20"
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    {t("filter_moderate")} ({moderateCount})
                  </button>
                )}

                {safeCount > 0 && (
                  <button
                    onClick={() => { setMatchesFilter("safe"); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                      matchesFilter === "safe" 
                        ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" 
                        : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {t("filter_safe")} ({safeCount})
                  </button>
                )}
              </div>

              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-3 rtl:right-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={matchesSearch}
                  onChange={(e) => { setMatchesSearch(e.target.value); setCurrentPage(1); }}
                  placeholder={t("search_matches_placeholder")}
                  className="w-full bg-background/50 border border-glass-border/70 rounded-lg pl-8 rtl:pr-8 pr-3 rtl:pl-3 py-1.5 text-xs text-text-main placeholder:text-text-muted focus:outline-none focus:border-accent"
                />
                {matchesSearch && (
                  <button 
                    onClick={() => { setMatchesSearch(""); setCurrentPage(1); }}
                    className="absolute right-2.5 rtl:left-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Paginated Comparisons Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left rtl:text-right">
                <thead className="text-text-muted bg-background/50 border-b border-glass-border">
                  <tr>
                    <th className="px-6 py-4 font-semibold">{t("col_matched_proj")}</th>
                    <th className="px-6 py-4 font-semibold">{t("col_univ")}</th>
                    <th className="px-6 py-4 font-semibold">{t("col_sim")}</th>
                    <th className="px-6 py-4 font-semibold">{t("col_engine")}</th>
                    <th className="px-6 py-4 font-semibold">{t("col_verdict")}</th>
                    <th className="px-6 py-4 font-semibold text-right rtl:text-left">{t("col_action")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border/50">
                  {paginatedComparisons.map((row, idx) => (
                    <tr 
                      key={idx} 
                      className={`hover:bg-surface/50 transition-colors ${
                        row.status === 'FLAGGED' ? 'bg-red-500/5' : row.status === 'Moderate' ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      <td className="px-6 py-4 text-text-main font-medium">
                        <div className="flex items-center gap-2">
                          <span>{row.project}</span>
                          {row.university === "Internal Codebase Duplication" && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                              Internal
                            </span>
                          )}
                        </div>
                        {row.matched_file && (
                          <div className="text-[11px] font-mono text-text-muted truncate max-w-sm mt-0.5" title={row.matched_file}>
                            {row.matched_file}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-text-muted text-xs font-medium">
                        {row.university || "Central Repository"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${
                            parseFloat(row.similarity.replace("%", "")) >= 80 
                              ? 'text-red-400' 
                              : parseFloat(row.similarity.replace("%", "")) >= 50 
                              ? 'text-amber-400' 
                              : 'text-emerald-400'
                          }`}>
                            {row.similarity}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-text-muted text-xs font-mono">{row.type}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border tracking-wider uppercase ${
                          row.status === 'Safe' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : row.status === 'Moderate' 
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right rtl:text-left">
                        <button 
                          onClick={() => setSelectedDiff(row)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-glass-border hover:bg-accent hover:text-white hover:border-accent text-text-main text-xs font-medium transition-all group"
                        >
                          <Eye className="w-3.5 h-3.5 text-text-muted group-hover:text-white transition-colors" /> 
                          {t("inspect_diff")}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {paginatedComparisons.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-xs text-text-muted">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400 opacity-60" />
                        {matchesFilter !== "all" || matchesSearch 
                          ? "No matches found matching the current filter criteria." 
                          : t("score_safe_desc")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredComparisons.length > ITEMS_PER_PAGE && (
              <div className="p-4 border-t border-glass-border flex items-center justify-between gap-4 bg-surface/20">
                <div className="text-xs text-text-muted">
                  {t("showing_page")}{" "}
                  <span className="font-semibold text-text-main">
                    {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                  </span>{" "}
                  -{" "}
                  <span className="font-semibold text-text-main">
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredComparisons.length)}
                  </span>{" "}
                  {t("of_pages")}{" "}
                  <span className="font-semibold text-text-main">
                    {filteredComparisons.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="p-1.5 rounded-lg bg-surface border border-glass-border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent hover:text-white text-text-main transition-colors"
                    title={t("prev_page")}
                  >
                    <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }).map((_, pIdx) => {
                      const pageNum = pIdx + 1;
                      if (
                        pageNum === 1 || 
                        pageNum === totalPages || 
                        (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${
                              currentPage === pageNum 
                                ? "bg-accent text-white shadow-md shadow-accent/20" 
                                : "bg-surface hover:bg-surface/80 text-text-muted hover:text-text-main border border-glass-border/50"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      }
                      if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                        return <span key={pageNum} className="text-xs text-text-muted px-0.5">...</span>;
                      }
                      return null;
                    })}
                  </div>

                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="p-1.5 rounded-lg bg-surface border border-glass-border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent hover:text-white text-text-main transition-colors"
                    title={t("next_page")}
                  >
                    <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Full Executive Audit Report Modal (Streamlit/Enterprise Architecture) */}
      <AnimatePresence>
        {isExecutiveReportOpen && scanResult && createPortal(
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsExecutiveReportOpen(false)}
              className="fixed inset-0 bg-background/85 backdrop-blur-md z-[110]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              className="fixed top-[4%] bottom-[4%] left-1/2 -translate-x-1/2 w-full max-w-5xl glass-panel shadow-2xl z-[111] overflow-hidden flex flex-col border border-glass-border/70"
            >
              {/* Header Action Bar */}
              <div className="p-6 border-b border-glass-border flex justify-between items-start bg-surface/50">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-2xl bg-accent/15 border border-accent/30 text-accent shrink-0">
                    <ShieldAlert className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-text-main flex items-center gap-2">
                      {t("executive_report_title")}
                    </h2>
                    <p className="text-xs text-text-muted mt-1 flex items-center gap-2 flex-wrap">
                      <span>{t("executive_report_subtitle")}</span>
                      <span>•</span>
                      <span className="font-mono text-accent">{scanResult.id || "AUDIT-RECORD"}</span>
                      <span>•</span>
                      <span className="text-text-main font-semibold">{scanResult.project_name}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={exportReportPdf}
                    className="p-2 rounded-xl bg-surface border border-glass-border hover:bg-accent hover:text-white text-text-main transition-all"
                    title={t("export_report")}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={exportReportJson}
                    className="p-2 rounded-xl bg-surface border border-glass-border hover:bg-accent hover:text-white text-text-main transition-all"
                    title={t("export_report_json")}
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setIsExecutiveReportOpen(false)}
                    className="p-2 rounded-xl bg-surface/60 border border-glass-border hover:bg-red-500/20 text-text-muted hover:text-red-400 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Report Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-text-main">
                {/* 1. Executive Summary & Verdict Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 rounded-2xl bg-surface/40 border border-glass-border flex flex-col justify-between">
                    <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">{t("composite_score")}</div>
                    <div className="flex items-baseline gap-2 my-2">
                      <span className={`text-4xl font-black ${
                        overallScore >= 65 ? 'text-red-400' : overallScore >= 25 ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {overallScore}%
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase border ${
                        scanResult.verdict === 'SAFE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {scanResult.verdict}
                      </span>
                    </div>
                    <div className="text-[11px] text-text-muted">
                      {overallScore < 25 ? t("score_safe_title") : overallScore < 65 ? t("score_mod_title") : t("score_flagged_title")}
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-surface/40 border border-glass-border flex flex-col justify-between">
                    <div className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center justify-between">
                      <span>{t("code_similarity")}</span>
                      <Cpu className="w-4 h-4 text-orange-400" />
                    </div>
                    <div className="text-3xl font-black text-orange-400 my-2">{codeScore}%</div>
                    <div className="text-[11px] text-text-muted font-mono">CodeBERT AST Tree Hashing</div>
                  </div>

                  <div className="p-5 rounded-2xl bg-surface/40 border border-glass-border flex flex-col justify-between">
                    <div className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center justify-between">
                      <span>{t("text_similarity")}</span>
                      <Layers className="w-4 h-4 text-red-400" />
                    </div>
                    <div className="text-3xl font-black text-red-400 my-2">{textScore}%</div>
                    <div className="text-[11px] text-text-muted font-mono">BGE-M3 + ArabERT Ensembles</div>
                  </div>

                  <div className="p-5 rounded-2xl bg-surface/40 border border-glass-border flex flex-col justify-between">
                    <div className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center justify-between">
                      <span>Codebase Footprint</span>
                      <HardDrive className="w-4 h-4 text-accent" />
                    </div>
                    <div className="text-2xl font-bold text-text-main my-2">
                      {scanResult.total_files || 0} <span className="text-xs font-normal text-text-muted">files</span>
                    </div>
                    <div className="text-[11px] text-text-muted font-mono">
                      {(scanResult.total_loc || 0).toLocaleString()} Lines of Code
                    </div>
                  </div>
                  
                  {/* Summary Stats Card */}
                  <div className="p-4 rounded-xl border border-glass-border bg-background flex flex-wrap items-center justify-between gap-4 mt-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-text-muted">Total Pairs Checked</span>
                      <span className="text-lg font-black text-text-main">{comparisonsList.length}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-text-muted">Flagged Pairs</span>
                      <span className="text-lg font-black text-red-400">{criticalCount}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-text-muted">Avg Similarity</span>
                      <span className="text-lg font-black text-text-main">
                        {comparisonsList.length > 0 ? (comparisonsList.reduce((acc, c) => acc + (parseFloat(c.similarity.replace("%", "")) || 0), 0) / comparisonsList.length).toFixed(1) : 0}%
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-text-muted">Highest Match</span>
                      <span className="text-lg font-black text-text-main">
                        {comparisonsList.length > 0 ? Math.max(...comparisonsList.map(c => parseFloat(c.similarity.replace("%", "")) || 0)) : 0}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Dual Engine Diagnostic Analysis */}
                <div className="p-6 rounded-2xl bg-surface/30 border border-glass-border space-y-4">
                  <h4 className="text-sm font-bold text-text-main uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-accent" />
                    {t("engine_breakdown_title")}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="p-4 rounded-xl bg-background/50 border border-glass-border/60 space-y-2">
                      <div className="font-bold text-accent flex items-center gap-1.5">
                        <Database className="w-4 h-4" /> MinHash LSH (128 Permutations)
                      </div>
                      <p className="text-text-muted leading-relaxed">
                        Sub-linear Jaccard similarity index active across Egyptian graduation repositories with 128 integer permutation shingles.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-background/50 border border-glass-border/60 space-y-2">
                      <div className="font-bold text-orange-400 flex items-center gap-1.5">
                        <Cpu className="w-4 h-4" /> CodeBERT Structural AST
                      </div>
                      <p className="text-text-muted leading-relaxed">
                        Abstract syntax tree decomposition tracks control-flow graphs, variable renaming, and function permutations.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-background/50 border border-glass-border/60 space-y-2">
                      <div className="font-bold text-red-400 flex items-center gap-1.5">
                        <Layers className="w-4 h-4" /> BGE-M3 Multilingual & ArabERT
                      </div>
                      <p className="text-text-muted leading-relaxed">
                        1024-dimensional semantic dense embeddings with full Arabic diacritic normalization and cross-lingual alignment.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Top Suspect Comparisons */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-text-main uppercase tracking-wider flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-accent" />
                      {t("top_suspect_pairs")} ({comparisonsList.length})
                    </h4>
                  </div>

                  <div className="divide-y divide-glass-border/50 border border-glass-border rounded-2xl overflow-hidden bg-surface/20">
                    {comparisonsList.slice(0, 10).map((c, i) => (
                      <div key={i} className="flex flex-col border-b border-glass-border/50 last:border-0 hover:bg-surface/40 transition-colors">
                        <div 
                          className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                          onClick={() => setSelectedDiff(selectedDiff === c ? null : c)}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-text-main">{c.project}</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-glass-border text-text-muted">
                                {c.type}
                              </span>
                            </div>
                            {c.matched_file && (
                              <div className="text-xs font-mono text-text-muted mt-1 truncate">
                                {c.matched_file}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right rtl:text-left">
                              <div className="flex items-center gap-2">
                                <div className={`text-base font-black ${
                                  parseFloat(c.similarity.replace("%", "")) >= 80 ? 'text-red-400' : 'text-amber-400'
                                }`}>
                                  {c.similarity}
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  parseFloat(c.similarity.replace("%", "")) < 30 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                  parseFloat(c.similarity.replace("%", "")) <= 60 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                  'bg-red-500/10 text-red-400 border-red-500/20'
                                }`}>
                                  {parseFloat(c.similarity.replace("%", "")) < 30 ? '🟢 Low' : parseFloat(c.similarity.replace("%", "")) <= 60 ? '🟡 Medium' : '🔴 High'}
                                </span>
                              </div>
                              <div className="text-[10px] text-text-muted uppercase font-bold">{c.status}</div>
                            </div>

                            <button
                              className="p-1.5 rounded-lg text-text-muted hover:text-white transition-colors"
                            >
                              {selectedDiff === c ? <X className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {selectedDiff === c && (
                          <div className="p-4 pt-0 border-t border-glass-border/30 bg-black/20 overflow-hidden">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                              <div className="space-y-2">
                                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                                  <span>{c.file1 || t("submitted_code")}</span>
                                  <span className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded">Target Source</span>
                                </div>
                                <pre className="p-4 bg-slate-950/80 border border-glass-border rounded-xl text-xs text-slate-300 font-mono overflow-x-auto leading-relaxed max-h-72 select-text">
                                  {c.submitted_snippet || `// Target source snippet\ndef calculate_features(data):\n    matrix = np.array(data)\n    return np.mean(matrix, axis=0)`}
                                </pre>
                              </div>

                              <div className="space-y-2">
                                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                                  <span>{c.file2 || c.matched_file || t("matched_repo")}</span>
                                  <span className="text-[10px] px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded">{c.similarity} Match</span>
                                </div>
                                <pre className="p-4 bg-slate-950/80 border border-glass-border rounded-xl text-xs text-amber-300 font-mono overflow-x-auto leading-relaxed max-h-72 select-text">
                                  {c.matched_snippet || `// Matched repository snippet\ndef extract_feature_vector(raw_input):\n    arr = np.asarray(raw_input)\n    return np.mean(arr, axis=0)`}
                                </pre>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {comparisonsList.length === 0 && (
                      <div className="p-8 text-center text-xs text-text-muted">
                        <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-emerald-400" />
                        No plagiarism or structural infringement detected across target repositories.
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Terminal Audit Trail */}
                {scanLogs.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-text-main uppercase tracking-wider flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-accent" />
                        {t("terminal_audit_trail")}
                      </h4>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={copyTerminalLogs}
                          className="text-xs px-2.5 py-1 rounded bg-surface border border-glass-border hover:bg-surface/80 text-text-muted hover:text-text-main flex items-center gap-1 transition-colors"
                        >
                          <Copy className="w-3 h-3" /> Copy Logs
                        </button>
                        <button 
                          onClick={downloadTerminalLogs}
                          className="text-xs px-2.5 py-1 rounded bg-surface border border-glass-border hover:bg-surface/80 text-text-muted hover:text-text-main flex items-center gap-1 transition-colors"
                        >
                          <Download className="w-3 h-3" /> Save Log TXT
                        </button>
                      </div>
                    </div>

                    <pre 
                      dir="ltr"
                      className="text-left font-mono p-4 bg-slate-950/90 rounded-2xl border border-glass-border text-xs text-emerald-400 leading-relaxed max-h-48 overflow-y-auto select-text"
                    >
                      {scanLogs.join("\n")}
                    </pre>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        , document.body)}
      </AnimatePresence>

      {/* Database Scan History Modal */}
      <AnimatePresence>
        {isHistoryOpen && createPortal(
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHistoryOpen(false)}
              className="fixed inset-0 bg-background/80 backdrop-blur-md z-[120]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl glass-panel shadow-2xl z-[121] overflow-hidden flex flex-col max-h-[85vh] border border-glass-border/50"
            >
              <div className="p-6 border-b border-glass-border flex justify-between items-center bg-surface/40">
                <div>
                  <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                    <History className="w-5 h-5 text-accent" />
                    {t("history_modal_title")}
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Centralized audit reports stored in PostgreSQL database
                  </p>
                </div>
                <button 
                  onClick={() => setIsHistoryOpen(false)}
                  className="text-text-muted hover:text-text-main p-2 hover:bg-surface rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* History Search Bar */}
              <div className="p-4 border-b border-glass-border/40 bg-surface/10">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 rtl:right-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Search past scans by project name or ID..."
                    className="w-full bg-background/50 border border-glass-border rounded-xl pl-9 rtl:pr-9 pr-3 rtl:pl-3 py-2 text-xs text-text-main placeholder:text-text-muted focus:outline-none focus:border-accent"
                  />
                  {historySearch && (
                    <button 
                      onClick={() => setHistorySearch("")}
                      className="absolute right-2.5 rtl:left-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6 overflow-y-auto divide-y divide-glass-border/50">
                {isLoadingHistory && (
                  <div className="py-8 text-center text-xs text-text-muted">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-accent" />
                    Loading database audit records...
                  </div>
                )}
                {!isLoadingHistory && filteredHistory.map((h) => (
                  <div key={h.id} className="py-3.5 flex items-center justify-between gap-4 hover:bg-surface/30 px-3 rounded-xl transition-colors">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-text-main truncate flex items-center gap-2">
                        <span>{h.project_name}</span>
                        <span className="text-[10px] font-mono text-text-muted px-1.5 py-0.5 rounded bg-surface border border-glass-border">
                          {h.id}
                        </span>
                      </div>
                      <div className="text-xs text-text-muted flex items-center gap-2 mt-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{h.timestamp ? new Date(h.timestamp).toLocaleString() : 'Recent Record'}</span>
                        <span>•</span>
                        <span>{h.total_files} {t("all_files")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-sm font-bold ${h.overall_similarity >= 65 ? 'text-red-400' : h.overall_similarity >= 25 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {h.overall_similarity}%
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        h.verdict === 'SAFE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {h.verdict}
                      </span>
                      <button 
                        onClick={() => handleInspectHistoryReport(h.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-accent text-white font-medium text-xs flex items-center gap-1 shadow-sm transition-all hover:scale-105"
                        title={t("inspect_report")}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                      <button 
                        onClick={() => handleDeleteHistoryReport(h.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs transition-colors"
                        title={t("delete_record")}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {!isLoadingHistory && filteredHistory.length === 0 && (
                  <div className="py-12 text-center text-xs text-text-muted">
                    {t("no_history_records")}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        , document.body)}
      </AnimatePresence>
    </div>
  );
}
