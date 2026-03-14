"use client";

import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonitoringTimeRange } from "@/types";

function seed(n: number) {
  return Math.abs(Math.sin(n * 4181 + 17393) * 99991) % 1;
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
    const base = seed(i);
    return {
      time: fmt(t),
      p50:  +(18 + base * 20).toFixed(1),
      p95:  +(55 + seed(i + 30) * 60).toFixed(1),
      p99:  +(120 + seed(i + 60) * 120).toFixed(1),
    };
  });
}

interface LatencyChartProps { timeRange: MonitoringTimeRange }

export default function LatencyChart({ timeRange }: LatencyChartProps) {
  const data = useMemo(() => generateData(timeRange), [timeRange]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Response Latency (ms)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} unit=" ms" />
              <Tooltip
                contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }}
                formatter={(v: number) => [`${v} ms`]}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="p50" stroke="#22c55e" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="p95" stroke="#f59e0b" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="p99" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
