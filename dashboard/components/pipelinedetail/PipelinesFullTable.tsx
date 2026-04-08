"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  Clock,
  GitBranch,
  Loader2,
  Search,
  Filter,
  Play,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { projectApi, pipelineApi } from "@/lib/apiClient";
import type { Project } from "@/types";

interface PipelineRow {
  id: string;
  projectId: string;
  project: string;
  branch: string;
  commit: string;
  commitMsg: string;
  status: "success" | "failed" | "running";
  duration: string | null;
  trigger: string;
  startedAt: string;
}

const statusConfig = {
  success: { icon: CheckCircle, className: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", label: "Success" },
  failed: { icon: XCircle, className: "text-red-400", bg: "bg-red-500/10 border-red-500/20", label: "Failed" },
  running: { icon: Clock, className: "text-blue-400 animate-pulse", bg: "bg-blue-500/10 border-blue-500/20", label: "Running" },
};

export default function PipelinesFullTable() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [runs, setRuns] = useState<PipelineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterProject, setFilterProject] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterBranch, setFilterBranch] = useState("all");
  const [triggerProjectId, setTriggerProjectId] = useState("");
  const [triggerBranch, setTriggerBranch] = useState("main");

  useEffect(() => {
    const load = async () => {
      try {
        const { data: projectsRes } = await projectApi.getProjects();
        const projectList = (projectsRes?.projects || []) as Project[];
        setProjects(projectList);
        if (projectList.length > 0 && !triggerProjectId) {
          setTriggerProjectId(projectList[0].id);
        }

        const mapStatus = (status: string): PipelineRow["status"] => {
          if (status === "in-progress" || status === "pending" || status === "queued" || status === "running") return "running";
          if (status === "failed" || status === "cancelled") return "failed";
          return "success";
        };

        const asDuration = (durationMs?: number) => {
          if (!durationMs || durationMs <= 0) return null;
          const seconds = Math.floor(durationMs / 1000);
          const minutes = Math.floor(seconds / 60);
          const rem = seconds % 60;
          return minutes > 0 ? `${minutes}m ${rem}s` : `${rem}s`;
        };

        const allRuns: PipelineRow[] = [];
        await Promise.all(
          projectList.map(async (project) => {
            try {
              const { data } = await pipelineApi.listProjectRuns(project.id);
              const source = Array.isArray(data?.runs) ? data.runs : [];
              for (const run of source) {
                allRuns.push({
                  id: String(run.id),
                  projectId: project.id,
                  project: project.name,
                  branch: String(run.branch || "main"),
                  commit: String(run.commit || "").slice(0, 7),
                  commitMsg: String(run.commitMsg || ""),
                  status: mapStatus(String(run.status || "pending")),
                  duration: asDuration(Number(run.duration || 0)),
                  trigger: String(run.triggeredBy || run.triggerType || "manual"),
                  startedAt: String(run.createdAt || new Date().toISOString()),
                });
              }
            } catch { /* skip */ }
          })
        );

        allRuns.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
        setRuns(allRuns);
      } catch {
        setRuns([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const branches = useMemo(() => {
    const set = new Set(runs.map((r) => r.branch));
    return Array.from(set).sort();
  }, [runs]);

  const filtered = useMemo(() => {
    return runs.filter((r) => {
      if (filterProject !== "all" && r.projectId !== filterProject) return false;
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (filterBranch !== "all" && r.branch !== filterBranch) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          r.project.toLowerCase().includes(q) ||
          r.branch.toLowerCase().includes(q) ||
          r.commit.toLowerCase().includes(q) ||
          r.trigger.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [runs, filterProject, filterStatus, filterBranch, searchQuery]);

  const handleTrigger = async () => {
    if (!triggerProjectId) return;
    setTriggering(true);
    try {
      await pipelineApi.triggerRun(triggerProjectId, { branch: triggerBranch });
      // Reload runs
      const { data } = await pipelineApi.listProjectRuns(triggerProjectId);
      const proj = projects.find((p) => p.id === triggerProjectId);
      const newRuns = Array.isArray(data?.runs) ? data.runs : [];
      if (newRuns.length > 0 && proj) {
        const latest = newRuns[0];
        const newRow: PipelineRow = {
          id: String(latest.id),
          projectId: proj.id,
          project: proj.name,
          branch: String(latest.branch || triggerBranch),
          commit: String(latest.commit || "").slice(0, 7),
          commitMsg: String(latest.commitMsg || ""),
          status: "running",
          duration: null,
          trigger: "manual",
          startedAt: new Date().toISOString(),
        };
        setRuns((prev) => [newRow, ...prev.filter((r) => r.id !== newRow.id)]);
      }
    } catch { /* handled silently */ } finally {
      setTriggering(false);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const diffMs = Date.now() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-4">
      {/* Trigger Row */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.08] bg-[#081425]/70 p-4">
        <span className="text-sm font-medium text-slate-300 mr-1">Trigger Pipeline:</span>
        <div className="relative">
          <select
            value={triggerProjectId}
            onChange={(e) => setTriggerProjectId(e.target.value)}
            disabled={triggering || projects.length === 0}
            className="appearance-none rounded-lg border border-white/[0.12] bg-[#0a1628]/80 px-3 py-2 pr-8 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
          >
            {projects.length === 0 && <option value="">No projects</option>}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        </div>
        <div className="relative">
          <select
            value={triggerBranch}
            onChange={(e) => setTriggerBranch(e.target.value)}
            disabled={triggering}
            className="appearance-none rounded-lg border border-white/[0.12] bg-[#0a1628]/80 px-3 py-2 pr-8 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
          >
            {["main", "develop", "staging"].map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        </div>
        <button
          onClick={handleTrigger}
          disabled={triggering || !triggerProjectId}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 py-2 text-sm font-semibold text-[#030711] transition-all hover:shadow-[0_0_24px_rgba(34,211,238,0.2)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
        >
          {triggering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" fill="currentColor" />}
          {triggering ? "Triggering..." : "Run Pipeline"}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.08] bg-[#081425]/70 p-4">
        <Filter className="h-4 w-4 text-slate-500" />
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search project, branch, commit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-white/[0.12] bg-[#0a1628]/80 pl-9 pr-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
          />
        </div>
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="rounded-lg border border-white/[0.12] bg-[#0a1628]/80 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
        >
          <option value="all">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-white/[0.12] bg-[#0a1628]/80 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
        >
          <option value="all">All Statuses</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
          <option value="running">Running</option>
        </select>
        <select
          value={filterBranch}
          onChange={(e) => setFilterBranch(e.target.value)}
          className="rounded-lg border border-white/[0.12] bg-[#0a1628]/80 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
        >
          <option value="all">All Branches</option>
          {branches.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        {(searchQuery || filterProject !== "all" || filterStatus !== "all" || filterBranch !== "all") && (
          <button
            onClick={() => { setSearchQuery(""); setFilterProject("all"); setFilterStatus("all"); setFilterBranch("all"); }}
            className="text-xs text-cyan-400 hover:text-cyan-300"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#081425]/70 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading pipeline runs...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="text-left px-5 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Project</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Branch</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Commit</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Duration</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Trigger</th>
                  <th className="text-right px-5 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Started</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      {runs.length === 0 ? "No pipeline runs yet. Trigger a pipeline to get started." : "No runs match filters."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((run) => {
                    const sc = statusConfig[run.status];
                    const StatusIcon = sc.icon;
                    return (
                      <tr
                        key={run.id}
                        onClick={() => router.push(`/dashboard/pipelines/run-log?runId=${run.id}`)}
                        className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer"
                      >
                        <td className="px-5 py-3">
                          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", sc.bg)}>
                            <StatusIcon className={cn("h-3.5 w-3.5", sc.className)} />
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-200 font-medium">{run.project}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-xs bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 rounded-full text-slate-300">
                            <GitBranch className="h-3 w-3 text-slate-500" />
                            {run.branch}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {run.commit ? (
                            <code className="text-xs text-cyan-400/80 bg-cyan-500/5 px-1.5 py-0.5 rounded" title={run.commitMsg}>
                              {run.commit}
                            </code>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {run.duration || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="capitalize text-xs text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded">{run.trigger}</span>
                        </td>
                        <td className="px-5 py-3 text-right text-slate-500 whitespace-nowrap">{formatTime(run.startedAt)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <div className="border-t border-white/[0.06] px-5 py-2.5 text-xs text-slate-600 flex items-center justify-between">
            <span>Showing {filtered.length} of {runs.length} runs</span>
          </div>
        )}
      </div>
    </div>
  );
}
