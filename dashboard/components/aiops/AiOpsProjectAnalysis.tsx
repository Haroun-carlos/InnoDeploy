"use client";

import { useState } from "react";
import { aiopsApi } from "@/lib/apiClient";
import type { AiOpsAnalysis } from "@/types";
import AiOpsResultCard from "./AiOpsResultCard";
import { Search, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
}

export default function AiOpsProjectAnalysis({ projectId }: Props) {
  const [result, setResult] = useState<AiOpsAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("1h");
  const [environment, setEnvironment] = useState("");

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await aiopsApi.analyseProject(projectId, {
        timeRange,
        environment: environment || undefined,
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-slate-300 outline-none transition hover:border-white/[0.15] focus:border-cyan-500/40"
        >
          <option value="15m">Last 15 min</option>
          <option value="1h">Last 1 hour</option>
          <option value="6h">Last 6 hours</option>
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
        </select>

        <input
          type="text"
          placeholder="Environment (optional)"
          value={environment}
          onChange={(e) => setEnvironment(e.target.value)}
          className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-slate-300 placeholder-slate-600 outline-none transition hover:border-white/[0.15] focus:border-cyan-500/40 w-48"
        />

        <button
          onClick={runAnalysis}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl hover:from-purple-500 hover:to-violet-500 disabled:opacity-50 text-sm font-medium transition-all shadow-[0_0_20px_rgba(139,92,246,0.15)] hover:shadow-[0_0_30px_rgba(139,92,246,0.25)]"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {loading ? "Analysing..." : "Analyse Project"}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/[0.06] border border-rose-500/20 rounded-xl text-rose-300 text-sm">
          {error}
        </div>
      )}

      {result && <AiOpsResultCard result={result} />}
    </div>
  );
}
