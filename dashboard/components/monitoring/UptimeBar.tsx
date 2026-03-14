"use client";

import { cn } from "@/lib/utils";

interface UptimeSegment {
  date: string;
  status: "up" | "incident";
}

// Generate 30 deterministic segments (last 30 days)
function generateSegments(): UptimeSegment[] {
  const now = new Date();
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (29 - i));
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    // Small chance of incident on certain days
    const isIncident = [3, 11, 22].includes(i);
    return { date: label, status: isIncident ? "incident" : "up" };
  });
}

const SEGMENTS = generateSegments();
const upDays = SEGMENTS.filter((s) => s.status === "up").length;
const uptimePct = ((upDays / SEGMENTS.length) * 100).toFixed(2);

export default function UptimeBar() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{SEGMENTS[0].date}</span>
        <span className="font-semibold text-foreground">{uptimePct}% uptime (30d)</span>
        <span>Today</span>
      </div>
      <div className="flex gap-0.5 h-8">
        {SEGMENTS.map((seg) => (
          <div
            key={seg.date}
            title={`${seg.date}: ${seg.status === "up" ? "Operational" : "Incident"}`}
            className={cn(
              "flex-1 rounded-sm cursor-default transition-opacity hover:opacity-75",
              seg.status === "up" ? "bg-green-500" : "bg-red-500"
            )}
          />
        ))}
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-500" />
          Operational
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-500" />
          Incident
        </span>
      </div>
    </div>
  );
}
