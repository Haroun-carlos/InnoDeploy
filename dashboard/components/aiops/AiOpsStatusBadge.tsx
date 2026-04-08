"use client";

import type { AiOpsStatus } from "@/types";
import { Cpu, Wifi, WifiOff } from "lucide-react";

interface Props {
  status: AiOpsStatus | null;
}

export default function AiOpsStatusBadge({ status }: Props) {
  if (!status) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <WifiOff className="h-4 w-4" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full ${
          status.enabled
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500"
        }`}
      >
        {status.enabled ? (
          <Wifi className="h-3 w-3" />
        ) : (
          <WifiOff className="h-3 w-3" />
        )}
        {status.enabled ? "AI Active" : "AI Disabled"}
      </div>
      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
        <Cpu className="h-3 w-3" />
        <span>{status.model}</span>
      </div>
    </div>
  );
}
