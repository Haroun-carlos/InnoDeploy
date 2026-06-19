"use client";

import { useState, useEffect, useMemo } from "react";
import { alertApi } from "@/lib/apiClient";
import {
  AlertTriangle,
  ShieldAlert,
  Info,
  CheckCircle2,
  Clock,
  Cpu,
  MemoryStick,
  Activity,
  Server,
  Rocket,
  HardDrive,
  ShieldCheck,
  Bell,
} from "lucide-react";

interface AlertItem {
  id: string;
  severity: "critical" | "warning" | "info";
  ruleType: string;
  message: string;
  status: "open" | "acknowledged" | "resolved";
  createdAt: string;
  metricAtTrigger?: { label: string; value: number; unit: string }[];
  project?: string;
  projectId?: string;
}

const severityConfig = {
  critical: {
    icon: ShieldAlert,
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    pulse: "animate-pulse",
    dot: "bg-rose-500",
    badge: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    pulse: "",
    dot: "bg-amber-500",
    badge: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  info: {
    icon: Info,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    pulse: "",
    dot: "bg-blue-500",
    badge: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
};

const ruleTypeIcons: Record<string, any> = {
  cpu: Cpu,
  memory: MemoryStick,
  latency: Activity,
  availability: Server,
  deployment: Rocket,
  disk: HardDrive,
  certificate: ShieldCheck,
};

const statusConfig = {
  open: { label: "Open", className: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
  acknowledged: { label: "Acknowledged", className: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  resolved: { label: "Resolved", className: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

type FilterType = "all" | "critical" | "warning" | "info";

interface Props {
  projectId?: string | null;
}

export default function AiOpsAlertsFeed({ projectId }: Props) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    const fetchAlerts = async () => {
      setLoading(true);
      try {
        const res = await alertApi.getAlerts();
        const data = res.data?.alerts ?? res.data ?? [];
        if (Array.isArray(data) && data.length > 0) {
          setAlerts(
            data.map((a: any) => ({
              id: a._id || a.id,
              severity: a.severity,
              ruleType: a.ruleType,
              message: a.message,
              status: a.status || "open",
              createdAt: a.createdAt,
              metricAtTrigger: a.metricAtTrigger || [],
              projectId: a.projectId,
            }))
          );
        } else {
          setAlerts([]);
        }
      } catch {
        setAlerts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, [projectId]);

  const handleAcknowledge = async (alertId: string) => {
    try {
      await alertApi.acknowledgeAlert(alertId);
    } catch {
      // Keep the optimistic local update even if the API call fails.
    }
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: "acknowledged" as const } : a))
    );
  };

  const filteredAlerts = useMemo(() => {
    const list = projectId ? alerts.filter((a) => String(a.projectId) === String(projectId)) : alerts;
    return filter === "all" ? list : list.filter((a) => a.severity === filter);
  }, [alerts, projectId, filter]);

  const counts = useMemo(() => {
    const list = projectId ? alerts.filter((a) => String(a.projectId) === String(projectId)) : alerts;
    return {
      critical: list.filter((a) => a.severity === "critical" && a.status === "open").length,
      warning: list.filter((a) => a.severity === "warning" && a.status === "open").length,
      info: list.filter((a) => a.severity === "info").length,
    };
  }, [alerts, projectId]);

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0a1628]/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-amber-400" />
          <h3 className="text-lg font-semibold text-white">Active Alerts</h3>
          {counts.critical > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 text-xs font-bold text-rose-400 animate-pulse">
              {counts.critical} critical
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
          {(["all", "critical", "warning", "info"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1 text-xs font-medium capitalize transition-all ${
                filter === f
                  ? f === "critical"
                    ? "bg-rose-500/20 text-rose-400"
                    : f === "warning"
                    ? "bg-amber-500/20 text-amber-400"
                    : f === "info"
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-white/10 text-white"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Alert list */}
      <div className="divide-y divide-white/[0.04] max-h-[420px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            <span className="ml-3 text-sm text-slate-500">Loading alerts...</span>
          </div>
        ) : !projectId ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Bell className="h-8 w-8 text-slate-600 mb-2" />
            <p className="text-sm text-slate-500">Select a project to view its alerts.</p>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <CheckCircle2 className="h-8 w-8 text-emerald-500/50 mb-2" />
            <p className="text-sm text-slate-500">No alerts have been recorded for this project yet.</p>
          </div>
        ) : (
          filteredAlerts.map((alert, index) => {
            const sev = severityConfig[alert.severity];
            const SevIcon = sev.icon;
            const RuleIcon = ruleTypeIcons[alert.ruleType] || AlertTriangle;
            const st = statusConfig[alert.status];

            return (
              <div
                key={alert.id}
                className={`group flex items-start gap-4 px-6 py-4 transition-all duration-300 hover:bg-white/[0.02] animate-rise-fade`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Severity indicator */}
                <div className={`relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${sev.bg} border ${sev.border}`}>
                  <SevIcon className={`h-4 w-4 ${sev.color} ${sev.pulse}`} />
                  <div className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ${sev.dot} ${alert.status === "open" && alert.severity === "critical" ? "animate-ping" : ""}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <RuleIcon className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                      {alert.ruleType}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${st.className}`}>
                      {st.label}
                    </span>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed">{alert.message}</p>

                  {/* Metric badges */}
                  {alert.metricAtTrigger && alert.metricAtTrigger.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {alert.metricAtTrigger.map((m, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 rounded-md bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 text-[10px] font-mono text-slate-400"
                        >
                          {m.label}: <span className="text-white font-medium">{m.value}</span>
                          {m.unit && <span className="text-slate-600">{m.unit}</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Timestamp & actions */}
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="flex items-center gap-1 text-[10px] text-slate-600">
                    <Clock className="h-3 w-3" />
                    {timeAgo(alert.createdAt)}
                  </span>
                  {alert.status === "open" && (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-slate-400 transition-all hover:border-cyan-500/30 hover:text-cyan-400 hover:bg-cyan-500/5 opacity-0 group-hover:opacity-100"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
