"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Terminal } from "lucide-react";
import XTermViewer from "@/components/shared/XTermViewer";
import { projectApi } from "@/lib/apiClient";
import type { LogEntry, LogLevel, Project } from "@/types";

type StreamState = "idle" | "connecting" | "live" | "reconnecting" | "offline";

type GatewayLogLine = {
  type?: string;
  projectId?: string;
  timestamp?: string;
  level?: string;
  message?: string;
  containerName?: string;
  id?: string;
};

const toLogLevel = (value?: string): LogLevel => {
  const safe = String(value || "info").toLowerCase();
  if (safe === "debug" || safe === "info" || safe === "warn" || safe === "error" || safe === "fatal") {
    return safe;
  }
  return "info";
};

export default function HomeTerminalPanel() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [streamState, setStreamState] = useState<StreamState>("idle");

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (!selectedProjectId) {
      setEntries([]);
      setStreamState("idle");
      return;
    }

    const loadLogs = async () => {
      try {
        const { data } = await projectApi.getProjectLogs(selectedProjectId, { limit: 120 });
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
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) {
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
            if (next.length > 400) {
              return next.slice(next.length - 400);
            }
            return next;
          });
        } catch {
          // Ignore non-JSON payloads.
        }
      };

      ws.onclose = () => {
        if (disposed) {
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
      disposed = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (activeSocket?.readyState === WebSocket.OPEN) {
        activeSocket.send(JSON.stringify({ type: "unsubscribe", projectId: selectedProjectId }));
      }
      activeSocket?.close();
      setStreamState("idle");
    };
  }, [selectedProjectId]);

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

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#081425]/70 p-4 space-y-3">
      <div className="flex flex-wrap items-end gap-3 justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-cyan-300" />
          <h2 className="text-base font-semibold text-white">Home Terminal</h2>
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
          <span className="text-xs rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-cyan-300">
            stream: {streamState}
          </span>
          <Link
            href="/dashboard/terminal"
            className="inline-flex items-center gap-1 rounded-lg border border-white/[0.12] px-3 py-2 text-xs text-slate-200 hover:bg-white/[0.06]"
          >
            Full terminal
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {selectedProjectId ? (
        <XTermViewer lines={terminalLines} height={260} />
      ) : (
        <div className="h-[260px] rounded-md border border-dashed border-white/[0.16] bg-[#0d1117] flex items-center justify-center px-6 text-center text-slate-400 text-sm">
          Create a project to enable live terminal logs on the dashboard home page.
        </div>
      )}
    </section>
  );
}
