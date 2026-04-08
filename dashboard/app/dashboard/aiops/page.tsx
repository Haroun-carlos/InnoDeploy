"use client";

import { useEffect, useState } from "react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import Sidebar from "@/components/shared/Sidebar";
import Navbar from "@/components/shared/Navbar";
import AiOpsOverviewCards from "@/components/aiops/AiOpsOverviewCards";
import AiOpsProjectAnalysis from "@/components/aiops/AiOpsProjectAnalysis";
import AiOpsAskAgent from "@/components/aiops/AiOpsAskAgent";
import AiOpsStatusBadge from "@/components/aiops/AiOpsStatusBadge";
import { aiopsApi, projectApi } from "@/lib/apiClient";
import { Brain } from "lucide-react";
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
        if (projectList.length > 0 && !selectedProjectId) {
          setSelectedProjectId(projectList[0].id || projectList[0]._id);
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
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-pulse text-gray-500">Loading AIOps module...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="h-7 w-7 text-purple-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  AI-Powered Monitoring
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  LLM-based anomaly detection, root cause analysis, and incident explanation
                </p>
              </div>
            </div>
            <AiOpsStatusBadge status={status} />
          </div>

          {/* Overview Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Organisation Overview
              </h2>
              <button
                onClick={runOverview}
                disabled={overviewLoading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium transition-colors"
              >
                {overviewLoading ? "Analysing..." : "Run AI Analysis"}
              </button>
            </div>
            <AiOpsOverviewCards overview={overview} loading={overviewLoading} />
          </div>

          {/* Project Analysis */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Project Analysis
              </h2>
              <select
                value={selectedProjectId || ""}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
              >
                {projects.map((p) => (
                  <option key={p.id || (p as any)._id} value={p.id || (p as any)._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            {selectedProjectId && (
              <AiOpsProjectAnalysis projectId={selectedProjectId} />
            )}
          </div>

          {/* Ask the Agent */}
          {selectedProjectId && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
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
