"use client";

import type { AiOpsOverview } from "@/types";
import { Activity, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface Props {
  overview: AiOpsOverview | null;
  loading: boolean;
}

const cards = [
  {
    key: "total" as const,
    label: "Total Projects",
    icon: Activity,
    gradient: "from-cyan-500/20 to-cyan-500/5",
    borderColor: "border-cyan-500/20",
    color: "text-cyan-400",
  },
  {
    key: "healthy" as const,
    label: "Healthy",
    icon: CheckCircle,
    gradient: "from-emerald-500/20 to-emerald-500/5",
    borderColor: "border-emerald-500/20",
    color: "text-emerald-400",
  },
  {
    key: "anomalies" as const,
    label: "Anomalies",
    icon: AlertTriangle,
    gradient: "from-amber-500/20 to-amber-500/5",
    borderColor: "border-amber-500/20",
    color: "text-amber-400",
  },
  {
    key: "errors" as const,
    label: "Errors",
    icon: XCircle,
    gradient: "from-rose-500/20 to-rose-500/5",
    borderColor: "border-rose-500/20",
    color: "text-rose-400",
  },
];

// Default mock values shown before the API loads
const defaultValues = { total: 4, healthy: 2, anomalies: 1, errors: 1 };

export default function AiOpsOverviewCards({ overview, loading }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ key, label, icon: Icon, gradient, borderColor, color }, index) => {
        const value = loading ? "…" : overview ? overview[key] : defaultValues[key];

        return (
          <div
            key={key}
            className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a1628]/60 p-5 transition-all duration-300 hover:border-white/[0.12] hover:shadow-[0_0_40px_rgba(0,0,0,0.3)] animate-rise-fade"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
            />
            <div
              className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-gradient-to-b ${gradient.replace("/20", "/60").replace("/5", "/30")}`}
            />

            <div className="relative flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">
                {label}
              </p>
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl border ${borderColor} bg-white/[0.03]`}
              >
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
            </div>

            <p className="relative mt-3 text-3xl font-bold tracking-tight text-white">
              {value}
            </p>
          </div>
        );
      })}
    </div>
  );
}
