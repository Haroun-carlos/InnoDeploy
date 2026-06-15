"use client";

import type { AiOpsSeverity } from "@/types";
import { AlertTriangle, Brain, CheckCircle, Lightbulb, Rocket, Search } from "lucide-react";

interface Props {
  result: {
    severity: AiOpsSeverity;
    hasAnomaly: boolean;
    analysis: string;
    problem: string;
    rootCause: string;
    solution: string;
    optimization: string;
    preScreenFlags?: { metric: string; value: number | string; level: string }[];
    metricsCount?: number;
    logsCount?: number;
    projectName?: string;
  };
}

const severityStyles: Record<AiOpsSeverity, { bg: string; border: string; badge: string; text: string; glow: string }> = {
  critical: {
    bg: "bg-rose-500/[0.06]",
    border: "border-rose-500/20",
    badge: "bg-rose-500/20 text-rose-400 border border-rose-500/30",
    text: "CRITICAL",
    glow: "shadow-[0_0_20px_rgba(244,63,94,0.1)]",
  },
  warning: {
    bg: "bg-amber-500/[0.06]",
    border: "border-amber-500/20",
    badge: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    text: "WARNING",
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.1)]",
  },
  info: {
    bg: "bg-emerald-500/[0.06]",
    border: "border-emerald-500/20",
    badge: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    text: "HEALTHY",
    glow: "shadow-[0_0_20px_rgba(16,185,129,0.1)]",
  },
};

const sections = [
  { key: "analysis", label: "Analysis", icon: Search, color: "text-cyan-400", accent: "border-cyan-500/20" },
  { key: "problem", label: "Problem", icon: AlertTriangle, color: "text-amber-400", accent: "border-amber-500/20" },
  { key: "rootCause", label: "Root Cause", icon: Brain, color: "text-purple-400", accent: "border-purple-500/20" },
  { key: "solution", label: "Solution", icon: CheckCircle, color: "text-emerald-400", accent: "border-emerald-500/20" },
  { key: "optimization", label: "Optimization", icon: Rocket, color: "text-indigo-400", accent: "border-indigo-500/20" },
] as const;

export default function AiOpsResultCard({ result }: Props) {
  const style = severityStyles[result.severity] || severityStyles.info;

  return (
    <div className={`${style.bg} border ${style.border} rounded-2xl overflow-hidden backdrop-blur-sm ${style.glow}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          {result.projectName && (
            <span className="text-sm font-medium text-slate-200">
              {result.projectName}
            </span>
          )}
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${style.badge}`}>
            {style.text}
          </span>
          {result.hasAnomaly && (
            <Lightbulb className="h-4 w-4 text-amber-400 animate-pulse" />
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          {result.metricsCount !== undefined && (
            <span className="rounded-md bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 font-mono">
              {result.metricsCount} metrics
            </span>
          )}
          {result.logsCount !== undefined && (
            <span className="rounded-md bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 font-mono">
              {result.logsCount} logs
            </span>
          )}
        </div>
      </div>

      {/* Pre-screen flags */}
      {result.preScreenFlags && result.preScreenFlags.length > 0 && (
        <div className="px-6 py-3 border-b border-white/[0.06] flex gap-2 flex-wrap">
          {result.preScreenFlags.map((flag, i) => (
            <span
              key={i}
              className={`text-[10px] px-2.5 py-1 rounded-full font-mono font-medium border ${
                flag.level === "critical"
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
              }`}
            >
              {flag.metric}: {flag.value}
              {flag.metric === "latency" ? "ms" : "%"}
            </span>
          ))}
        </div>
      )}

      {/* Sections */}
      <div className="divide-y divide-white/[0.04]">
        {sections.map(({ key, label, icon: Icon, color, accent }) => {
          const content = result[key];
          if (!content) return null;
          return (
            <div key={key} className="px-6 py-5">
              <div className={`flex items-center gap-2 mb-3 pl-3 border-l-2 ${accent}`}>
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="text-sm font-semibold text-slate-200">
                  {label}
                </span>
              </div>
              <div className="text-sm text-slate-400 whitespace-pre-wrap leading-relaxed pl-3">
                {content}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
