"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { projectApi } from "@/lib/apiClient";
import {
  Terminal,
  Filter,
  ChevronDown,
  AlertCircle,
  AlertTriangle,
  Info,
  Bug,
  ArrowDownToLine,
} from "lucide-react";

interface LogEntry {
  id: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  source: string;
  containerName: string;
  timestamp: string;
  environment: string;
}

const levelConfig = {
  error: {
    icon: AlertCircle,
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    label: "ERR",
    labelColor: "text-rose-400",
  },
  warn: {
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    label: "WRN",
    labelColor: "text-amber-400",
  },
  info: {
    icon: Info,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    label: "INF",
    labelColor: "text-blue-400",
  },
  debug: {
    icon: Bug,
    color: "text-slate-500",
    bg: "bg-slate-500/10",
    border: "border-slate-500/20",
    label: "DBG",
    labelColor: "text-slate-500",
  },
};

// Mock logs for demo
function generateMockLogs(): LogEntry[] {
  const messages = {
    error: [
      "Connection pool exhausted — 0 available connections",
      "Unhandled rejection: TypeError: Cannot read property 'id' of undefined",
      "MongoDB connection lost — attempting reconnect...",
      "Payment processing failed: Stripe API returned 402",
      "JWT verification failed: token expired",
      "Docker container OOMKilled: auth-service (limit: 512MB)",
      "Pipeline stage 'test' failed with exit code 1",
      "Failed to pull image: registry.io/payment-svc:latest — 401 Unauthorized",
    ],
    warn: [
      "High memory usage detected: 85% — threshold: 80%",
      "Slow query detected: 3200ms on collection 'orders'",
      "Rate limit approaching for API key sk_live_***",
      "Connection pool utilisation at 78%",
      "Deprecated API endpoint called: GET /api/v1/users",
      "Disk space warning: 78% used on /data volume",
      "Failed to send email notification — retrying in 30s",
      "Request timeout after 5000ms — /api/reports/generate",
    ],
    info: [
      "Server started on port 3000",
      "Connected to MongoDB successfully",
      "Health check passed — all services healthy",
      "Deployment v2.4.2 completed successfully",
      "Cache cleared — 1,247 entries invalidated",
      "New user registration: user_4821@example.com",
      "Payment processed successfully — order #78432",
      "WebSocket connection established — 142 active connections",
      "Database migration applied: 20240115_add_indexes",
      "SSL certificate renewed — expires in 90 days",
      "Backup completed: 2.4 GB compressed to 890 MB",
      "API rate limit reset for client_342",
      "Cron job 'cleanup-expired-sessions' completed in 450ms",
    ],
    debug: [
      "Incoming request: GET /api/projects — 185.210.45.12",
      "Cache hit for key: project:a8f3c2:metrics",
      "Query executed in 12ms: db.metrics.find({...})",
      "WebSocket ping/pong — latency: 8ms",
      "Incoming request: POST /api/auth/login — 192.168.1.45",
      "Cache miss for key: user:session:f7e2a1",
    ],
  };

  const sources = ["app", "nginx", "docker", "system", "cron"];
  const containers = ["ecommerce-api", "admin-dashboard", "payment-gateway", "auth-service", "nginx-proxy"];
  const environments = ["production", "staging"];
  const logs: LogEntry[] = [];

  for (let i = 0; i < 80; i++) {
    const levelRoll = Math.random();
    const level: LogEntry["level"] =
      levelRoll < 0.1 ? "error" : levelRoll < 0.25 ? "warn" : levelRoll < 0.45 ? "debug" : "info";
    const msgPool = messages[level];
    const ts = new Date(Date.now() - i * 15000 - Math.random() * 30000);

    logs.push({
      id: `log-${i}`,
      level,
      message: msgPool[Math.floor(Math.random() * msgPool.length)],
      source: sources[Math.floor(Math.random() * sources.length)],
      containerName: containers[Math.floor(Math.random() * containers.length)],
      timestamp: ts.toISOString(),
      environment: environments[Math.floor(Math.random() * environments.length)],
    });
  }

  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

type LevelFilter = "all" | "error" | "warn" | "info" | "debug";

interface Props {
  projectId?: string | null;
}

export default function AiOpsLogStream({ projectId }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!projectId) {
        setLogs(generateMockLogs());
        setLoading(false);
        return;
      }
      try {
        const res = await projectApi.getProjectLogs(projectId, { limit: 100 });
        const data = res.data?.logs ?? [];
        if (data.length > 0) {
          setLogs(
            data.map((l: any, i: number) => ({
              id: l._id || `log-${i}`,
              level: l.level || "info",
              message: l.message || "",
              source: l.source || "system",
              containerName: l.containerName || "",
              timestamp: l.eventAt || l.timestamp || l.createdAt || new Date().toISOString(),
              environment: l.environment || "production",
            }))
          );
        } else {
          setLogs(generateMockLogs());
        }
      } catch {
        setLogs(generateMockLogs());
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [projectId]);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [logs, autoScroll]);

  const filteredLogs = useMemo(
    () => (levelFilter === "all" ? logs : logs.filter((l) => l.level === levelFilter)),
    [logs, levelFilter]
  );

  const levelCounts = useMemo(
    () => ({
      error: logs.filter((l) => l.level === "error").length,
      warn: logs.filter((l) => l.level === "warn").length,
      info: logs.filter((l) => l.level === "info").length,
      debug: logs.filter((l) => l.level === "debug").length,
    }),
    [logs]
  );

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0a1628]/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-emerald-400" />
          <h3 className="text-lg font-semibold text-white">Log Stream</h3>
          <span className="text-xs text-slate-600">{filteredLogs.length} entries</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Level counts */}
          <div className="hidden sm:flex items-center gap-2">
            {(["error", "warn", "info", "debug"] as const).map((level) => {
              const cfg = levelConfig[level];
              return (
                <span
                  key={level}
                  className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-mono ${cfg.bg} border ${cfg.border} ${cfg.labelColor}`}
                >
                  {cfg.label}: {levelCounts[level]}
                </span>
              );
            })}
          </div>

          {/* Filter */}
          <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
            {(["all", "error", "warn", "info", "debug"] as LevelFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setLevelFilter(f)}
                className={`rounded-lg px-2 py-1 text-[10px] font-medium uppercase tracking-wider transition-all ${
                  levelFilter === f
                    ? f === "error"
                      ? "bg-rose-500/20 text-rose-400"
                      : f === "warn"
                      ? "bg-amber-500/20 text-amber-400"
                      : f === "info"
                      ? "bg-blue-500/20 text-blue-400"
                      : f === "debug"
                      ? "bg-slate-500/20 text-slate-400"
                      : "bg-white/10 text-white"
                    : "text-slate-600 hover:text-slate-400"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Auto-scroll toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`rounded-lg border p-1.5 transition-all ${
              autoScroll
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-white/[0.08] bg-white/[0.03] text-slate-500 hover:text-slate-300"
            }`}
            title={autoScroll ? "Auto-scroll ON" : "Auto-scroll OFF"}
          >
            <ArrowDownToLine className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Log entries */}
      <div
        ref={scrollRef}
        className="max-h-[400px] overflow-y-auto font-mono text-xs"
        style={{
          background:
            "linear-gradient(180deg, rgba(3,7,17,0.8) 0%, rgba(10,22,40,0.6) 100%)",
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
            <span className="ml-3 text-sm text-slate-500">Loading logs...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Filter className="h-6 w-6 text-slate-600 mb-2" />
            <p className="text-sm text-slate-500">No logs matching filter</p>
          </div>
        ) : (
          filteredLogs.map((log, index) => {
            const cfg = levelConfig[log.level];

            return (
              <div
                key={log.id}
                className="group flex items-start gap-0 border-b border-white/[0.02] transition-colors hover:bg-white/[0.02] animate-rise-fade"
                style={{ animationDelay: `${Math.min(index, 20) * 20}ms` }}
              >
                {/* Timestamp */}
                <span className="shrink-0 w-[72px] px-3 py-1.5 text-slate-600 select-none">
                  {formatTime(log.timestamp)}
                </span>

                {/* Level badge */}
                <span
                  className={`shrink-0 w-[38px] px-1.5 py-1.5 font-bold ${cfg.labelColor} text-center select-none`}
                >
                  {cfg.label}
                </span>

                {/* Source */}
                <span className="shrink-0 w-[70px] px-2 py-1.5 text-slate-600 truncate select-none">
                  [{log.source}]
                </span>

                {/* Container */}
                <span className="shrink-0 w-[130px] px-1 py-1.5 text-slate-500 truncate select-none">
                  {log.containerName}
                </span>

                {/* Message */}
                <span
                  className={`flex-1 px-2 py-1.5 break-all ${
                    log.level === "error"
                      ? "text-rose-300"
                      : log.level === "warn"
                      ? "text-amber-300"
                      : log.level === "debug"
                      ? "text-slate-500"
                      : "text-slate-300"
                  }`}
                >
                  {log.message}
                </span>

                {/* Environment */}
                <span className="shrink-0 w-[60px] px-2 py-1.5 text-right text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity select-none">
                  {log.environment === "production" ? "prod" : "stg"}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
