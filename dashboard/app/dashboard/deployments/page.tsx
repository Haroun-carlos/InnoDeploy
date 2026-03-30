"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCcw, Activity, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import DeployActivityChart from "@/components/homepage/DeployActivityChart";
import Sidebar from "@/components/shared/Sidebar";
import Navbar from "@/components/shared/Navbar";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useLanguagePreference } from "@/hooks/useLanguagePreference";
import { t } from "@/lib/settingsI18n";
import { projectApi } from "@/lib/apiClient";
import type { Project } from "@/types";

type DeploymentRecord = {
  id: string;
  projectId: string;
  projectName: string;
  version: string;
  strategy: string;
  status: "success" | "failed" | "in-progress";
  createdAt: string;
};

const toDeploymentStatus = (status: string): DeploymentRecord["status"] => {
  if (status === "failed" || status === "cancelled") return "failed";
  if (status === "success") return "success";
  return "in-progress";
};

const statusConfig = {
  success: { icon: CheckCircle2, label: "Success", className: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  failed: { icon: XCircle, label: "Failed", className: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
  "in-progress": { icon: Loader2, label: "In Progress", className: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
};

export default function DeploymentsPage() {
  const language = useLanguagePreference();
  const isReady = useRequireAuth();
  const [deployments, setDeployments] = useState<DeploymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDeployments = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: projectsRes } = await projectApi.getProjects();
      const projects = (Array.isArray(projectsRes?.projects) ? projectsRes.projects : []) as Project[];

      const historyBatches = await Promise.allSettled(
        projects.map(async (project) => {
          const { data } = await projectApi.getDeploymentHistory(project.id);
          const history = Array.isArray(data?.history) ? data.history : [];

          return history.map((item: any) => ({
            id: String(item._id || item.id || `${project.id}-${item.createdAt || Date.now()}`),
            projectId: project.id,
            projectName: project.name,
            version: String(item.version || "unknown"),
            strategy: String(item.strategy || "rolling"),
            status: toDeploymentStatus(String(item.status || "in-progress")),
            createdAt: String(item.createdAt || new Date().toISOString()),
          })) as DeploymentRecord[];
        })
      );

      const merged = historyBatches
        .flatMap((batch) => (batch.status === "fulfilled" ? batch.value : []))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setDeployments(merged);
    } catch {
      setError("Failed to load deployments.");
      setDeployments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady) return;
    void loadDeployments();
  }, [isReady]);

  const deploymentStats = useMemo(
    () => [
      {
        label: t(language, "deployments.successful"),
        value: deployments.filter((item) => item.status === "success").length,
        gradient: "from-emerald-500/20 to-emerald-500/5",
        borderColor: "border-emerald-500/20",
        color: "text-emerald-400",
        icon: CheckCircle2,
      },
      {
        label: t(language, "deployments.failed"),
        value: deployments.filter((item) => item.status === "failed").length,
        gradient: "from-rose-500/20 to-rose-500/5",
        borderColor: "border-rose-500/20",
        color: "text-rose-400",
        icon: XCircle,
      },
      {
        label: t(language, "deployments.inProgress"),
        value: deployments.filter((item) => item.status === "in-progress").length,
        gradient: "from-amber-500/20 to-amber-500/5",
        borderColor: "border-amber-500/20",
        color: "text-amber-400",
        icon: Loader2,
      },
    ],
    [deployments, language]
  );

  if (!isReady) return null;

  return (
    <div className="flex min-h-screen bg-[#030711]">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Navbar />
        <main className="relative flex-1 space-y-6 p-6 overflow-hidden">
          {/* Background */}
          <div className="pointer-events-none absolute inset-0 grid-pattern" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(56,189,248,0.06),transparent)]" />

          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/10 border border-cyan-500/20">
                  <Activity className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white">{t(language, "deployments.pageTitle")}</h1>
                  <p className="text-sm text-slate-500">{t(language, "deployments.subtitle")}</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => void loadDeployments()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:border-white/[0.15] hover:bg-white/[0.06] disabled:opacity-50"
            >
              <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {error && (
            <div className="relative rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-300 backdrop-blur-sm">{error}</div>
          )}

          {/* Stat cards */}
          <div className="relative grid gap-4 sm:grid-cols-3">
            {deploymentStats.map((stat, index) => (
              <div
                key={stat.label}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a1628]/60 p-5 transition-all duration-300 hover:border-white/[0.12] hover:shadow-[0_0_40px_rgba(0,0,0,0.3)] animate-rise-fade"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
                <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-gradient-to-b ${stat.gradient.replace('/20', '/60').replace('/5', '/30')}`} />
                <div className="relative flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">{stat.label}</p>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${stat.borderColor} bg-white/[0.03]`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </div>
                <p className="relative mt-3 text-3xl font-bold tracking-tight text-white">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Deployments table */}
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a1628]/60">
            <div className="border-b border-white/[0.06] px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Recent Deployments</h2>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                  <span className="ml-3 text-sm text-slate-500">Loading deployments...</span>
                </div>
              ) : deployments.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500">No deployment history available yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-left">
                        <th className="pb-3 font-medium text-slate-500 text-xs uppercase tracking-[0.1em]">Project</th>
                        <th className="pb-3 font-medium text-slate-500 text-xs uppercase tracking-[0.1em]">Version</th>
                        <th className="pb-3 font-medium text-slate-500 text-xs uppercase tracking-[0.1em]">Strategy</th>
                        <th className="pb-3 font-medium text-slate-500 text-xs uppercase tracking-[0.1em]">Status</th>
                        <th className="pb-3 font-medium text-slate-500 text-xs uppercase tracking-[0.1em]">Started</th>
                        <th className="pb-3 font-medium text-slate-500 text-xs uppercase tracking-[0.1em]">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deployments.slice(0, 12).map((item) => {
                        const sc = statusConfig[item.status];
                        const StatusIcon = sc.icon;
                        return (
                          <tr key={item.id} className="border-b border-white/[0.04] last:border-0 transition-colors hover:bg-white/[0.02]">
                            <td className="py-3 font-medium text-slate-200">{item.projectName}</td>
                            <td className="py-3 text-slate-400 font-mono text-xs">{item.version}</td>
                            <td className="py-3 capitalize text-slate-400">{item.strategy}</td>
                            <td className="py-3">
                              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${sc.className}`}>
                                <StatusIcon className={`h-3 w-3 ${item.status === "in-progress" ? "animate-spin" : ""}`} />
                                {sc.label}
                              </span>
                            </td>
                            <td className="py-3 text-slate-500 text-xs">{new Date(item.createdAt).toLocaleString()}</td>
                            <td className="py-3">
                              <Link href={`/dashboard/projects/${item.projectId}`} className="text-cyan-400 hover:text-cyan-300 text-xs font-medium transition">
                                View project →
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="relative">
            <DeployActivityChart />
          </div>
        </main>
      </div>
    </div>
  );
}
