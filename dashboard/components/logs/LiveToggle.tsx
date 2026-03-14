"use client";

import { Radio, History } from "lucide-react";
import { cn } from "@/lib/utils";

export type LogMode = "live" | "historical";

interface LiveToggleProps {
  mode: LogMode;
  onChange: (mode: LogMode) => void;
}

export default function LiveToggle({ mode, onChange }: LiveToggleProps) {
  return (
    <div className="flex items-center rounded-md border overflow-hidden">
      <button
        onClick={() => onChange("live")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors",
          mode === "live"
            ? "bg-primary text-primary-foreground"
            : "bg-background text-muted-foreground hover:text-foreground"
        )}
      >
        <Radio className={cn("h-3.5 w-3.5", mode === "live" && "animate-pulse")} />
        Live
      </button>
      <button
        onClick={() => onChange("historical")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-l",
          mode === "historical"
            ? "bg-primary text-primary-foreground"
            : "bg-background text-muted-foreground hover:text-foreground"
        )}
      >
        <History className="h-3.5 w-3.5" />
        Historical
      </button>
    </div>
  );
}
