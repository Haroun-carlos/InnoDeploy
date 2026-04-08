"use client";

import { useEffect, useState } from "react";
import {
  Rocket,
  GitBranch,
  AlertTriangle,
  Server,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { projectApi, pipelineApi, alertApi, hostApi } from "@/lib/apiClient";
import type { Project, ProjectAlert, Host } from "@/types";

type EventType = "deploy" | "pipeline" | "alert" | "host";

interface TimelineEvent {
  id: string;
  type: EventType;
  title: string;
  description: string;
  status: "success" | "failed" | "warning" | "info" | "running";
  timestamp: string;
}

const eventIcons: Record<EventType, React.ReactNode> = {
  deploy: <Rocket className="h-3.5 w-3.5" />,
  pipeline: <GitBranch className="h-3.5 w-3.5" />,
  alert: <AlertTriangle className="h-3.5 w-3.5" />,
  host: <Server className="h-3.5 w-3.5" />,
};

const statusColors: Record<string, string> = {
  success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  failed: "border-red-500/40 bg-red-500/10 text-red-400",
  warning: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
  info: "border-blue-500/40 bg-blue-500/10 text-blue-400",
  running: "border-blue-500/40 bg-blue-500/10 text-blue-400",
};

const lineColors: Record<string, string> = {
  success: "bg-emerald-500/30",
  failed: "bg-red-500/30",
  warning: "bg-yellow-500/30",
  info: "bg-blue-500/30",
  running: "bg-blue-500/30",
};

function formatRelative(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ActivityTimeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: projectsRes }, { data: alertsRes }, { data: hostsRes }] = await Promise.all([
          projectApi.getProjects(),
          alertApi.getAlerts(),
          hostApi.getHosts(),
        ]);

        const projects = (projectsRes?.projects || []) as Project[];
        const alerts = (alertsRes?.alerts || []) as ProjectAlert[];
        const hostsList = (hostsRes?.hosts || hostsRes || []) as Host[];
        const allEvents: TimelineEvent[] = [];

        // Deployments
        await Promise.all(
          projects.map(async (project) => {
            try {
              const { data } = await projectApi.getDeploymentHistory(project.id);
              const deployments = data?.deployments || [];
              for (const d of deployments.slice(0, 5)) {
                allEvents.push({
                  id: `deploy-${d.id}`,
                  type: "deploy",
                  title: `Deployed ${project.name}`,
                  description: `v${d.version || "latest"} via ${d.strategy || "rolling"} by ${d.triggeredBy || "system"}`,
                  status: d.status === "success" ? "success" : d.status === "failed" ? "failed" : "running",
                  timestamp: d.createdAt,
                });
              }
            } catch {
              // skip
            }
          })
        );

        // Pipelines
        await Promise.all(
          projects.map(async (project) => {
            try {
              const { data } = await pipelineApi.listProjectRuns(project.id);
              const runs = Array.isArray(data?.runs) ? data.runs : [];
              for (const run of runs.slice(0, 5)) {
                const status = run.status === "success"
                  ? "success"
                  : run.status === "failed" || run.status === "cancelled"
                    ? "failed"
                    : "running";
                allEvents.push({
                  id: `pipeline-${run.id}`,
                  type: "pipeline",
                  title: `Pipeline ${project.name}`,
                  description: `Branch: ${run.branch || "main"} — ${run.status}`,
                  status,
                  timestamp: run.createdAt,
                });
              }
            } catch {
              // skip
            }
          })
        );

        // Alerts
        for (const alert of alerts.slice(0, 10)) {
          allEvents.push({
            id: `alert-${alert.id}`,
            type: "alert",
            title: `Alert: ${alert.ruleType}`,
            description: alert.message,
            status: alert.severity === "critical" ? "failed" : alert.severity === "warning" ? "warning" : "info",
            timestamp: alert.timestamp,
          });
        }

        // Hosts (just show them as info events)
        for (const host of hostsList) {
          allEvents.push({
            id: `host-${host.id}`,
            type: "host",
            title: `Host: ${host.hostname}`,
            description: `${host.ip} — ${host.status}${host.os ? ` — ${host.os}` : ""}`,
            status: host.status === "online" ? "success" : "failed",
            timestamp: new Date().toISOString(),
          });
        }

        allEvents.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        setEvents(allEvents.slice(0, 20));
      } catch {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#081425]/70 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5 text-cyan-300" />
        <h2 className="text-lg font-semibold text-white">Activity Timeline</h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading activity...
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-10 text-sm text-slate-500">
          No activity recorded yet. Actions you take will appear here.
        </div>
      ) : (
        <div className="relative max-h-[500px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
          {events.map((event, index) => (
            <div key={event.id} className="flex gap-3 group">
              {/* Timeline track */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
                    statusColors[event.status]
                  )}
                >
                  {eventIcons[event.type]}
                </div>
                {index < events.length - 1 && (
                  <div className={cn("w-0.5 flex-1 min-h-[20px]", lineColors[event.status])} />
                )}
              </div>

              {/* Content */}
              <div className="pb-4 pt-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-slate-200">{event.title}</span>
                  <span className="text-[10px] text-slate-600">{formatRelative(event.timestamp)}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{event.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
