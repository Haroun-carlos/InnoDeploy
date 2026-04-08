"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Rocket,
  Clock,
  User,
} from "lucide-react";
import { projectApi } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import type { Deployment, Project } from "@/types";

interface DeployRow {
  id: string;
  project: string;
  version: string;
  environment: string;
  strategy: string;
  status: "success" | "failed" | "in-progress";
  triggeredBy: string;
  duration: string;
  createdAt: string;
}

const statusIcon = {
  success: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  failed: <XCircle className="h-4 w-4 text-red-400" />,
  "in-progress": <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />,
};

const statusLabel = {
  success: "Success",
  failed: "Failed",
  "in-progress": "In Progress",
};

const statusBadge = {
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  failed: "bg-red-500/10 text-red-400 border-red-500/20",
  "in-progress": "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

export default function RecentDeployments() {
  const [deploys, setDeploys] = useState<DeployRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: projectsRes } = await projectApi.getProjects();
        const projects = (projectsRes?.projects || []) as Project[];

        const allDeploys: DeployRow[] = [];

        await Promise.all(
          projects.map(async (project) => {
            try {
              const { data } = await projectApi.getDeploymentHistory(project.id);
              const deployments = (data?.deployments || []) as Deployment[];
              deployments.forEach((d) => {
                allDeploys.push({
                  id: d.id,
                  project: project.name,
                  version: d.version || "latest",
                  environment: "production",
                  strategy: d.strategy || "rolling",
                  status: d.status,
                  triggeredBy: d.triggeredBy || "system",
                  duration: d.duration || "—",
                  createdAt: d.createdAt,
                });
              });
            } catch {
              // skip project on error
            }
          })
        );

        allDeploys.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setDeploys(allDeploys.slice(0, 8));
      } catch {
        setDeploys([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const now = Date.now();
    const diffMs = now - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
  };

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#081425]/70 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Rocket className="h-5 w-5 text-cyan-300" />
        <h2 className="text-lg font-semibold text-white">Recent Deployments</h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading deployments...
        </div>
      ) : deploys.length === 0 ? (
        <div className="text-center py-10 text-sm text-slate-500">
          No deployments recorded yet. Deploy a project to see history here.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-xs uppercase tracking-wider text-slate-500">
                <th className="text-left py-2 pr-4 font-medium">Status</th>
                <th className="text-left py-2 pr-4 font-medium">Project</th>
                <th className="text-left py-2 pr-4 font-medium">Version</th>
                <th className="text-left py-2 pr-4 font-medium">Strategy</th>
                <th className="text-left py-2 pr-4 font-medium">Triggered By</th>
                <th className="text-left py-2 pr-4 font-medium">Duration</th>
                <th className="text-right py-2 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {deploys.map((d) => (
                <tr
                  key={d.id}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-2.5 pr-4">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                        statusBadge[d.status]
                      )}
                    >
                      {statusIcon[d.status]}
                      {statusLabel[d.status]}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-slate-200 font-medium">{d.project}</td>
                  <td className="py-2.5 pr-4">
                    <code className="text-xs text-cyan-400/80 bg-cyan-500/5 px-1.5 py-0.5 rounded">
                      {d.version}
                    </code>
                  </td>
                  <td className="py-2.5 pr-4 text-slate-400 capitalize">{d.strategy}</td>
                  <td className="py-2.5 pr-4">
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <User className="h-3 w-3" />
                      {d.triggeredBy}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <Clock className="h-3 w-3" />
                      {d.duration}
                    </span>
                  </td>
                  <td className="py-2.5 text-right text-slate-500">{formatTime(d.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
