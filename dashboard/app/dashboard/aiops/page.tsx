"use client";

import { useEffect, useState } from "react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import Sidebar from "@/components/shared/Sidebar";
import Navbar from "@/components/shared/Navbar";
import AiOpsOverviewCards from "@/components/aiops/AiOpsOverviewCards";
import AiOpsProjectAnalysis from "@/components/aiops/AiOpsProjectAnalysis";
import AiOpsAskAgent from "@/components/aiops/AiOpsAskAgent";
import AiOpsStatusBadge from "@/components/aiops/AiOpsStatusBadge";
import AiOpsMetricsCharts from "@/components/aiops/AiOpsMetricsCharts";
import AiOpsAlertsFeed from "@/components/aiops/AiOpsAlertsFeed";
import AiOpsLogStream from "@/components/aiops/AiOpsLogStream";
import { aiopsApi, projectApi } from "@/lib/apiClient";
import { Brain, Sparkles, ChevronDown, Loader2 } from "lucide-react";
import type { AiOpsOverview, AiOpsStatus, Project } from "@/types";

export default function AiOpsPage() {
  const isReady = useRequireAuth();
  const [overview, setOverview] = useState<AiOpsOverview | null>(null);
  const [status, setStatus] = useState<AiOpsStatus | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [overviewLoading, setOverviewLoading] = useState(false);

  useEffect(() => {
    if (!isReady) return;

    const load = async () => {
      try {
        const [statusRes, projectsRes] = await Promise.all([
          aiopsApi.getStatus(),
          projectApi.getProjects(),
        ]);
        setStatus(statusRes.data);
        const projectList = projectsRes.data?.projects ?? projectsRes.data ?? [];
        setProjects(projectList);
        
        let targetProjId = selectedProjectId;
        if (projectList.length > 0 && !targetProjId) {
          targetProjId = projectList[0].id || projectList[0]._id;
          setSelectedProjectId(targetProjId);
        }

        // Fetch overview automatically
        setOverviewLoading(true);
        try {
          const overviewRes = await aiopsApi.getOverview();
          setOverview(overviewRes.data);
        } catch (overviewErr) {
          console.error("Failed to load overview data on mount:", overviewErr);
        } finally {
          setOverviewLoading(false);
        }
      } catch (err) {
        console.error("Failed to load AIOps data:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isReady]);

  const runOverview = async () => {
    setOverviewLoading(true);
    try {
      const res = await aiopsApi.getOverview();
      setOverview(res.data);
    } catch (err) {
      console.error("Failed to load overview:", err);
    } finally {
      setOverviewLoading(false);
    }
  };

  if (!isReady || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#030711]">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
          <span className="text-slate-500 text-sm">Loading AI-Powered Monitoring...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#030711]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="relative flex-1 overflow-y-auto p-6 space-y-8">
          {/* Background decorations */}
          <div className="pointer-events-none absolute inset-0 grid-pattern" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(139,92,246,0.06),transparent)]" />

          {/* ── Header ──────────────────────────────────── */}
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-violet-500/10 border border-purple-500/20">
                <Brain className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  OpenClaw AI Monitoring
                  <Sparkles className="h-5 w-5 text-purple-400" />
                </h1>
                <p className="text-sm text-slate-500">
                  LLM-based anomaly detection, root cause analysis, and incident explanation
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              {projects.length > 0 && (
                <div className="relative flex items-center">
                  <span className="text-xs text-slate-500 mr-2 uppercase tracking-wider font-semibold">Project:</span>
                  <div className="relative">
                    <select
                      value={selectedProjectId || ""}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="appearance-none rounded-xl border border-white/[0.08] bg-white/[0.03] pl-3 pr-8 py-2 text-sm text-slate-300 outline-none transition hover:border-white/[0.15] focus:border-purple-500/40 cursor-pointer min-w-[160px]"
                    >
                      {projects.map((p) => (
                        <option key={p.id || (p as any)._id} value={p.id || (p as any)._id} className="bg-[#0f172a] text-slate-300">
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  </div>
                </div>
              )}
              <AiOpsStatusBadge status={status} />
            </div>
          </div>

          {/* ── Overview Section ─────────────────────────── */}
          <div className="relative space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Organisation Overview
              </h2>
              <button
                onClick={runOverview}
                disabled={overviewLoading}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl hover:from-purple-500 hover:to-violet-500 disabled:opacity-50 text-sm font-medium transition-all shadow-[0_0_20px_rgba(139,92,246,0.15)] hover:shadow-[0_0_30px_rgba(139,92,246,0.25)]"
              >
                {overviewLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4" />
                )}
                {overviewLoading ? "Analysing..." : "Run AI Analysis"}
              </button>
            </div>
            <AiOpsOverviewCards overview={overview} loading={overviewLoading} />
          </div>

          {/* ── Real-time Metrics Charts ──────────────────── */}
          <div className="relative">
            <AiOpsMetricsCharts projectId={selectedProjectId} />
          </div>

          {/* ── Alerts & Logs side by side ────────────────── */}
          <div className="relative grid gap-6 lg:grid-cols-2">
            <AiOpsAlertsFeed projectId={selectedProjectId} />
            <AiOpsLogStream projectId={selectedProjectId} />
          </div>

          {/* ── Project Analysis ──────────────────────────── */}
          <div className="relative space-y-4">
            <h2 className="text-lg font-semibold text-white">
              Project Analysis
            </h2>
            {selectedProjectId && (
              <AiOpsProjectAnalysis projectId={selectedProjectId} />
            )}
          </div>

          {/* ── Ask the Agent ─────────────────────────────── */}
          {selectedProjectId && (
            <div className="relative space-y-4">
              <h2 className="text-lg font-semibold text-white">
                Ask the DevOps Agent
              </h2>
              <AiOpsAskAgent projectId={selectedProjectId} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
