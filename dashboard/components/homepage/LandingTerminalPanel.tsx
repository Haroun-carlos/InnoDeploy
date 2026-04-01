"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import XTermViewer from "@/components/shared/XTermViewer";
import { projectApi } from "@/lib/apiClient";
import type { LogEntry, LogLevel, Project } from "@/types";

type StreamState = "demo" | "idle" | "connecting" | "live" | "reconnecting" | "offline";

type GatewayLogLine = {
  type?: string;
  projectId?: string;
  timestamp?: string;
  level?: string;
  message?: string;
  containerName?: string;
  id?: string;
};

const demoLines = [
  "$ innodeploy init --project acme-api",
  "[ok] Project initialized",
  "$ innodeploy deploy --branch main --strategy rolling",
  "[run] Building container image...",
  "[run] Running health checks...",
  "[ok] Deploy successful - 3 replicas healthy",
  "[ok] Route traffic switched (0ms downtime)",
  " -> https://acme-api.innodeploy.app",
];

const toLogLevel = (value?: string): LogLevel => {
  const safe = String(value || "info").toLowerCase();
  if (safe === "debug" || safe === "info" || safe === "warn" || safe === "error" || safe === "fatal") {
    return safe;
  }
  return "info";
};

export default function LandingTerminalPanel() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [streamState, setStreamState] = useState<StreamState>("demo");

  const hasToken = typeof window !== "undefined" && Boolean(localStorage.getItem("accessToken"));

  useEffect(() => {
    if (!hasToken) {
      setStreamState("demo");
      return;
    }

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
  }, [hasToken]);

  useEffect(() => {
    if (!hasToken || !selectedProjectId) {
      if (hasToken) setStreamState("idle");
      return;
    }

    const loadLogs = async () => {
      try {
        const { data } = await projectApi.getProjectLogs(selectedProjectId, { limit: 100 });
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
      }
    };

    void loadLogs();
  }, [hasToken, selectedProjectId]);

  useEffect(() => {
    if (!hasToken || !selectedProjectId) return;

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
    let disposed = false;

    const connect = () => {
      if (disposed) return;

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
            if (next.length > 300) return next.slice(next.length - 300);
            return next;
          });
        } catch {
          // Ignore non-JSON events.
        }
      };

      ws.onclose = () => {
        if (disposed) {
          setStreamState("idle");
          return;
        }

        reconnectAttempts += 1;
        const cappedAttempt = Math.min(reconnectAttempts, 6);
        const delayMs = Math.min(500 * 2 ** cappedAttempt + Math.floor(Math.random() * 250), 15000);
        setStreamState("reconnecting");
        reconnectTimer = setTimeout(connect, delayMs);
      };
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (activeSocket?.readyState === WebSocket.OPEN) {
        activeSocket.send(JSON.stringify({ type: "unsubscribe", projectId: selectedProjectId }));
      }
      activeSocket?.close();
      setStreamState("idle");
    };
  }, [hasToken, selectedProjectId]);

  const liveLines = useMemo(() => {
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

  const lines = hasToken && selectedProjectId ? liveLines : demoLines;
  const statusLabel = hasToken ? `stream: ${streamState}` : "demo";

  const statusClass =
    !hasToken || streamState === "demo"
      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
      : streamState === "live"
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
        : streamState === "offline"
          ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
          : "border-amber-500/30 bg-amber-500/10 text-amber-300";

  return (
    <div className="relative mx-auto w-full max-w-[860px]">
      <div className="absolute -inset-5 rounded-3xl bg-gradient-to-r from-cyan-500/12 via-emerald-500/6 to-sky-500/12 blur-2xl" />
      <div className="absolute inset-x-10 -top-6 h-20 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative overflow-hidden rounded-2xl border border-slate-200/[0.12] bg-[linear-gradient(180deg,rgba(13,29,53,0.88),rgba(8,18,34,0.92))] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(34,211,238,0.12),transparent_35%),radial-gradient(circle_at_85%_0%,rgba(52,211,153,0.08),transparent_30%)]" />

        <div className="relative flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/[0.08] bg-[#0d1d35]/70 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840]" />
            </div>

            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Terminal</span>
            <span className="hidden text-[11px] text-slate-500 sm:inline">innodeploy://live-preview</span>
          </div>

          <div className="flex items-center gap-2">
            {hasToken ? (
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="rounded-md border border-white/15 bg-[#0b1830]/90 px-2.5 py-1.5 text-xs font-medium text-slate-100 outline-none transition focus:border-cyan-400/40"
              >
                {projects.length === 0 && <option value="">No projects</option>}
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            ) : null}

            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${statusClass}`}>
              {statusLabel}
            </span>

            <Link
              href="/dashboard/terminal"
              className="inline-flex items-center gap-1 rounded-md border border-cyan-400/20 bg-cyan-400/5 px-2.5 py-1.5 text-xs font-medium text-cyan-200 transition hover:bg-cyan-400/12 hover:text-cyan-100"
            >
              Open full terminal
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="relative px-4 pt-3 text-[11px] text-slate-400">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1">Runtime: Node 20</span>
            <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1">Transport: WebSocket</span>
            <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1">Mode: {hasToken ? "Live" : "Demo"}</span>
          </div>
        </div>

        <div className="relative p-4 pt-3">
          <XTermViewer lines={lines} height={280} />
        </div>
      </div>
    </div>
  );
}
