"use client";

import { useState } from "react";
import { aiopsApi } from "@/lib/apiClient";
import type { AiOpsAskResult } from "@/types";
import AiOpsResultCard from "./AiOpsResultCard";
import { MessageSquare, Send, Loader2 } from "lucide-react";

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
          <MessageSquare className="absolute left-4 top-3.5 h-4 w-4 text-slate-600" />
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about this project... e.g. 'Why is memory usage increasing?' or 'What caused the last deployment failure?'"
            rows={2}
            className="w-full pl-11 pr-4 py-3 border border-white/[0.08] bg-white/[0.03] rounded-xl text-sm text-slate-200 placeholder-slate-600 resize-none outline-none transition-all hover:border-white/[0.15] focus:border-purple-500/40 focus:shadow-[0_0_20px_rgba(139,92,246,0.1)]"
          />
        </div>
        <button
          onClick={handleAsk}
          disabled={loading || question.trim().length < 3}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl hover:from-purple-500 hover:to-violet-500 disabled:opacity-50 text-sm font-medium transition-all shadow-[0_0_20px_rgba(139,92,246,0.15)] hover:shadow-[0_0_30px_rgba(139,92,246,0.25)]"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {loading ? "Thinking..." : "Ask"}
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
