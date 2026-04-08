"use client";

import type { AiOpsOverview } from "@/types";
import { Activity, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface Props {
  overview: AiOpsOverview | null;
  loading: boolean;
}

const cards = [
  { key: "total" as const, label: "Total Projects", icon: Activity, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
  { key: "healthy" as const, label: "Healthy", icon: CheckCircle, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
  { key: "anomalies" as const, label: "Anomalies", icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
  { key: "errors" as const, label: "Errors", icon: XCircle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20" },
];

export default function AiOpsOverviewCards({ overview, loading }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ key, label, icon: Icon, color, bg }) => (
        <div
          key={key}
          className={`${bg} rounded-xl p-5 border border-gray-200 dark:border-gray-700`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {loading ? "…" : overview ? overview[key] : "—"}
              </p>
            </div>
            <Icon className={`h-8 w-8 ${color}`} />
          </div>
        </div>
      ))}
    </div>
  );
}
