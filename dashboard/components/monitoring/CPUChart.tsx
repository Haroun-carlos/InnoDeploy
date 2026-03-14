"use client";

import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonitoringTimeRange } from "@/types";

function seed(n: number) {
  // deterministic-ish pseudo-random using sin
  return Math.abs(Math.sin(n * 9301 + 49297) * 233280) % 1;
}

function generateData(range: MonitoringTimeRange) {
  const configs: Record<MonitoringTimeRange, { count: number; stepMs: number; fmt: (d: Date) => string }> = {
    "1h":     { count: 13, stepMs: 5  * 60 * 1000, fmt: (d) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) },
    "6h":     { count: 13, stepMs: 30 * 60 * 1000, fmt: (d) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) },
    "24h":    { count: 25, stepMs: 60 * 60 * 1000, fmt: (d) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) },
    "7d":     { count: 29, stepMs: 6  * 60 * 60 * 1000, fmt: (d) => d.toLocaleDateString("en-GB", { weekday: "short", hour: "2-digit" }) },
    "30d":    { count: 31, stepMs: 24 * 60 * 60 * 1000, fmt: (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) },
    "custom": { count: 25, stepMs: 60 * 60 * 1000, fmt: (d) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) },
  };
  const { count, stepMs, fmt } = configs[range];
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const t = new Date(now - (count - 1 - i) * stepMs);
    const base = i / count;
    return {
      time: fmt(t),
      "web-1": +(20 + seed(i) * 40 + Math.sin(base * Math.PI * 3) * 10).toFixed(1),
      "web-2": +(15 + seed(i + 50) * 35 + Math.sin(base * Math.PI * 3 + 1) * 8).toFixed(1),
      "web-3": +(10 + seed(i + 100) * 30 + Math.sin(base * Math.PI * 3 + 2) * 6).toFixed(1),
    };
  });
}

interface CPUChartProps { timeRange: MonitoringTimeRange }

export default function CPUChart({ timeRange }: CPUChartProps) {
  const data = useMemo(() => generateData(timeRange), [timeRange]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">CPU Usage (%)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
              <Tooltip
                contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }}
                formatter={(v: number) => [`${v}%`]}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="web-1" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="web-2" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="web-3" stroke="#06b6d4" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
