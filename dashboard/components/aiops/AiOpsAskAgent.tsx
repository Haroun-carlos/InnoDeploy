"use client";

import { useState } from "react";
import { aiopsApi } from "@/lib/apiClient";
import type { AiOpsAskResult } from "@/types";
import AiOpsResultCard from "./AiOpsResultCard";
import { MessageSquare, Send } from "lucide-react";

interface Props {
  projectId: string;
}

export default function AiOpsAskAgent({ projectId }: Props) {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<AiOpsAskResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAsk = async () => {
    if (!question.trim() || question.trim().length < 3) return;
    setLoading(true);
    setError(null);
    try {
      const res = await aiopsApi.askAboutProject(projectId, question.trim());
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 relative">
          <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about this project... e.g. 'Why is memory usage increasing?' or 'What caused the last deployment failure?'"
            rows={2}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 resize-none"
          />
        </div>
        <button
          onClick={handleAsk}
          disabled={loading || question.trim().length < 3}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium transition-colors"
        >
          <Send className="h-4 w-4" />
          {loading ? "Thinking..." : "Ask"}
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
