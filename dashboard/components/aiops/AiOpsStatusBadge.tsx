"use client";

import type { AiOpsStatus } from "@/types";
import { Cpu, Wifi, WifiOff, Zap } from "lucide-react";

interface Props {
  status: AiOpsStatus | null;
}

export default function AiOpsStatusBadge({ status }: Props) {
  if (!status) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <WifiOff className="h-4 w-4" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
          status.enabled
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.1)]"
            : "bg-white/[0.03] text-slate-500 border-white/[0.08]"
        }`}
      >
        {status.enabled ? (
          <>
            <Zap className="h-3 w-3" />
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          </>
        ) : (
          <WifiOff className="h-3 w-3" />
        )}
        {status.enabled ? "AI Active" : "AI Disabled"}
      </div>
      <div className="flex items-center gap-1 text-xs text-slate-500 rounded-full border border-white/[0.06] bg-white/[0.02] px-2.5 py-1">
        <Cpu className="h-3 w-3" />
        <span className="font-mono">{status.model}</span>
      </div>
    </div>
  );
}
