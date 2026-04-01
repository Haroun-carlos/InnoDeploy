"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/shared/Sidebar";
import Navbar from "@/components/shared/Navbar";
import XTermViewer from "@/components/shared/XTermViewer";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { projectApi } from "@/lib/apiClient";
import type { LogEntry, LogLevel, Project } from "@/types";

type GatewayLogLine = {
  type?: string;
  projectId?: string;
  timestamp?: string;
  level?: string;
  message?: string;
  containerName?: string;
  id?: string;
};

type StreamState = "idle" | "connecting" | "live" | "reconnecting" | "offline";

const toLogLevel = (value?: string): LogLevel => {
  const safe = String(value || "info").toLowerCase();
  if (safe === "debug" || safe === "info" || safe === "warn" || safe === "error" || safe === "fatal") {
    return safe;
  }
  return "info";
};

export default function DashboardTerminalPage() {
  const isReady = useRequireAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [streamState, setStreamState] = useState<StreamState>("idle");
  const [loadingLogs, setLoadingLogs] = useState(false);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  useEffect(() => {
    if (!isReady) return;

    const loadProjects = async () => {
      try {
        const { data } = await projectApi.getProjects();
        const nextProjects = Array.isArray(data?.projects) ? (data.projects as Project[]) : [];
        setProjects(nextProjects);
        setSelectedProjectId((prev) => prev || nextProjects[0]?.id || "");
      } catch {
        setProjects([]);
      }
    };

    void loadProjects();
  }, [isReady]);

  useEffect(() => {
    if (!isReady || !selectedProjectId) return;

    const loadLogs = async () => {
      try {
        setLoadingLogs(true);
        const { data } = await projectApi.getProjectLogs(selectedProjectId, { limit: 400 });
        const logs = Array.isArray(data?.logs) ? data.logs : [];
        setEntries(
          logs.map((log: any) => ({
            id: String(log._id || log.id),
            timestamp: String(log.eventAt || log.createdAt || new Date().toISOString()),
            level: toLogLevel(log.level),
            container: String(log.containerName || "app"),
            message: String(log.message || ""),
          }))
        );
      } catch {
        setEntries([]);
      } finally {
        setLoadingLogs(false);
      }
    };

    void loadLogs();
  }, [isReady, selectedProjectId]);

  useEffect(() => {
    if (!isReady || !selectedProjectId) {
      setStreamState("idle");
      return;
    }

    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      setStreamState("offline");
      return;
    }

    const configuredBase = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:7070";
    const wsHttpBase = configuredBase.replace(/^ws/i, "http").replace(/\/+$/, "");
    const wsUrl = `${wsHttpBase}/ws?token=${encodeURIComponent(accessToken)}`.replace(/^http/i, "ws");

    let reconnectAttempts = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let activeSocket: WebSocket | null = null;
    let isUnmounted = false;

    const connect = () => {
      if (isUnmounted) return;

      setStreamState(reconnectAttempts === 0 ? "connecting" : "reconnecting");
      const ws = new WebSocket(wsUrl);
      activeSocket = ws;

      ws.onopen = () => {
        reconnectAttempts = 0;
        setStreamState("live");
        ws.send(JSON.stringify({ type: "subscribe", projectId: selectedProjectId }));
      };

      ws.onmessage = (event: MessageEvent<string>) => {
        try {
          const payload = JSON.parse(event.data) as GatewayLogLine;
          if (payload.type !== "log.line") return;
          if (payload.projectId && payload.projectId !== selectedProjectId) return;

          const nextEntry: LogEntry = {
            id: payload.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            timestamp: payload.timestamp || new Date().toISOString(),
            level: toLogLevel(payload.level),
            container: payload.containerName || "app",
            message: payload.message || "",
          };

          setEntries((prev) => {
            const next = [...prev, nextEntry];
            if (next.length > 1800) {
              return next.slice(next.length - 1800);
            }
            return next;
          });
        } catch {
          // Ignore non-JSON gateway events.
        }
      };

      ws.onclose = () => {
        if (isUnmounted) {
          setStreamState("idle");
          return;
        }

        reconnectAttempts += 1;
        const cappedAttempt = Math.min(reconnectAttempts, 6);
        const baseDelay = 500 * 2 ** cappedAttempt;
        const jitter = Math.floor(Math.random() * 300);
        const nextDelayMs = Math.min(baseDelay + jitter, 15000);

        setStreamState("reconnecting");
        reconnectTimer = setTimeout(connect, nextDelayMs);
      };
    };

    connect();

    return () => {
      isUnmounted = true;

      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }

      if (activeSocket?.readyState === WebSocket.OPEN) {
        activeSocket.send(JSON.stringify({ type: "unsubscribe", projectId: selectedProjectId }));
      }

      activeSocket?.close();
      setStreamState("idle");
    };
  }, [isReady, selectedProjectId]);

  const terminalLines = useMemo(() => {
    return entries.map((entry) => {
      const time = new Date(entry.timestamp).toLocaleTimeString([], {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      return `[${time}] [${entry.level.toUpperCase()}] [${entry.container}] ${entry.message}`;
    });
  }, [entries]);

  if (!isReady) return null;

  return (
    <div className="flex min-h-screen bg-[#030711]">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Navbar />

        <main className="relative flex-1 p-6 space-y-4 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 grid-pattern" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_-20%,rgba(56,189,248,0.08),transparent)]" />

          <div className="relative flex flex-wrap items-end gap-3 justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard Terminal</h1>
              <p className="text-sm text-slate-400">Open your project logs as a live terminal stream.</p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="rounded-lg border border-white/[0.12] bg-[#0a1628]/80 px-3 py-2 text-sm text-slate-100"
              >
                {projects.length === 0 && <option value="">No projects</option>}
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <div className="text-xs rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-cyan-300">
                stream: {streamState}
              </div>
            </div>
          </div>

          <div className="relative rounded-2xl border border-white/[0.08] bg-[#081425]/70 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{selectedProject ? `Project: ${selectedProject.name}` : "Select a project"}</span>
              <span>{loadingLogs ? "Loading logs..." : `${entries.length} lines`}</span>
            </div>

            {selectedProjectId ? (
              <XTermViewer lines={terminalLines} height={560} />
            ) : (
              <div className="h-[560px] rounded-md border border-dashed border-white/[0.16] bg-[#0d1117] flex items-center justify-center px-6 text-center text-slate-400 text-sm">
                Create a project first, then select it here to open the live terminal stream.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
