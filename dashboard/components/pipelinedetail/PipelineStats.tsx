"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Clock, Zap } from "lucide-react";
import { projectApi, pipelineApi } from "@/lib/apiClient";
import type { Project } from "@/types";

interface PipelineKpi {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
  borderColor: string;
}

function formatDuration(ms: number) {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  if (minutes < 60) return `${minutes}m ${rem}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export default function PipelineStats() {
  const [kpis, setKpis] = useState<PipelineKpi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: projectsRes } = await projectApi.getProjects();
        const projects = (projectsRes?.projects || []) as Project[];

        let totalRuns = 0;
        let successRuns = 0;
        let failedRuns = 0;
        let totalDurationMs = 0;
        let durationCount = 0;

        await Promise.all(
          projects.map(async (project) => {
            try {
              const { data } = await pipelineApi.listProjectRuns(project.id);
              const runs = Array.isArray(data?.runs) ? data.runs : [];
              totalRuns += runs.length;
              for (const run of runs) {
                const st = String(run.status || "");
                if (st === "success" || st === "completed") successRuns++;
                else if (st === "failed" || st === "cancelled") failedRuns++;
                const dur = Number(run.duration || 0);
                if (dur > 0) { totalDurationMs += dur; durationCount++; }
              }
            } catch { /* skip */ }
          })
        );

        const successRate = totalRuns > 0 ? ((successRuns / totalRuns) * 100).toFixed(1) : "0";
        const avgDuration = durationCount > 0 ? formatDuration(Math.round(totalDurationMs / durationCount)) : "—";

        setKpis([
          { label: "Total Runs", value: String(totalRuns), icon: <Zap className="h-4 w-4" />, color: "text-blue-400", gradient: "from-blue-500/20 to-blue-500/5", borderColor: "border-blue-500/20" },
          { label: "Success Rate", value: `${successRate}%`, icon: <CheckCircle2 className="h-4 w-4" />, color: "text-emerald-400", gradient: "from-emerald-500/20 to-emerald-500/5", borderColor: "border-emerald-500/20" },
          { label: "Failed Runs", value: String(failedRuns), icon: <XCircle className="h-4 w-4" />, color: "text-red-400", gradient: "from-red-500/20 to-red-500/5", borderColor: "border-red-500/20" },
          { label: "Avg Duration", value: avgDuration, icon: <Clock className="h-4 w-4" />, color: "text-amber-400", gradient: "from-amber-500/20 to-amber-500/5", borderColor: "border-amber-500/20" },
        ]);
      } catch {
        setKpis([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl border border-white/[0.06] bg-[#0a1628]/60 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map(({ label, value, icon, color, gradient, borderColor }, index) => (
        <div
          key={label}
          className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a1628]/60 p-5 transition-all duration-300 hover:border-white/[0.12] hover:shadow-[0_0_40px_rgba(0,0,0,0.3)]"
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
          <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-gradient-to-b ${gradient.replace("/20", "/60").replace("/5", "/30")}`} />
          <div className="relative flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">{label}</p>
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${borderColor} bg-white/[0.03] transition group-hover:scale-110`}>
              <span className={color}>{icon}</span>
            </div>
          </div>
          <p className="relative mt-2 text-3xl font-bold tracking-tight text-white">{value}</p>
        </div>
      ))}
    </div>
  );
}
