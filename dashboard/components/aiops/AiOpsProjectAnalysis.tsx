"use client";

import { useState } from "react";
import { aiopsApi } from "@/lib/apiClient";
import type { AiOpsAnalysis } from "@/types";
import AiOpsResultCard from "./AiOpsResultCard";
import { Search } from "lucide-react";

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
          className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
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
          className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white w-48"
        />

        <button
          onClick={runAnalysis}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium transition-colors"
        >
          <Search className="h-4 w-4" />
          {loading ? "Analysing..." : "Analyse Project"}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {result && <AiOpsResultCard result={result} />}
    </div>
  );
}
