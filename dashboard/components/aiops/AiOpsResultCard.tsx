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

const severityStyles: Record<AiOpsSeverity, { bg: string; border: string; badge: string; text: string }> = {
  critical: {
    bg: "bg-red-50 dark:bg-red-900/10",
    border: "border-red-300 dark:border-red-800",
    badge: "bg-red-600 text-white",
    text: "CRITICAL",
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-900/10",
    border: "border-amber-300 dark:border-amber-800",
    badge: "bg-amber-500 text-white",
    text: "WARNING",
  },
  info: {
    bg: "bg-green-50 dark:bg-green-900/10",
    border: "border-green-300 dark:border-green-800",
    badge: "bg-green-600 text-white",
    text: "HEALTHY",
  },
};

const sections = [
  { key: "analysis", label: "Analysis", icon: Search, color: "text-blue-600" },
  { key: "problem", label: "Problem", icon: AlertTriangle, color: "text-amber-600" },
  { key: "rootCause", label: "Root Cause", icon: Brain, color: "text-purple-600" },
  { key: "solution", label: "Solution", icon: CheckCircle, color: "text-green-600" },
  { key: "optimization", label: "Optimization", icon: Rocket, color: "text-indigo-600" },
] as const;

export default function AiOpsResultCard({ result }: Props) {
  const style = severityStyles[result.severity] || severityStyles.info;

  return (
    <div className={`${style.bg} border ${style.border} rounded-xl overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          {result.projectName && (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {result.projectName}
            </span>
          )}
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${style.badge}`}>
            {style.text}
          </span>
          {result.hasAnomaly && (
            <Lightbulb className="h-4 w-4 text-amber-500" />
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          {result.metricsCount !== undefined && (
            <span>{result.metricsCount} metrics</span>
          )}
          {result.logsCount !== undefined && (
            <span>{result.logsCount} logs</span>
          )}
        </div>
      </div>

      {/* Pre-screen flags */}
      {result.preScreenFlags && result.preScreenFlags.length > 0 && (
        <div className="px-5 py-2 border-b border-gray-200 dark:border-gray-700 flex gap-2 flex-wrap">
          {result.preScreenFlags.map((flag, i) => (
            <span
              key={i}
              className={`text-xs px-2 py-0.5 rounded font-medium ${
                flag.level === "critical"
                  ? "bg-red-100 text-red-700 dark:bg-red-800/30 dark:text-red-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-800/30 dark:text-amber-300"
              }`}
            >
              {flag.metric}: {flag.value}
              {flag.metric === "latency" ? "ms" : "%"}
            </span>
          ))}
        </div>
      )}

      {/* Sections */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {sections.map(({ key, label, icon: Icon, color }) => {
          const content = result[key];
          if (!content) return null;
          return (
            <div key={key} className="px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {label}
                </span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
                {content}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
