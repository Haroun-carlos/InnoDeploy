"use client";

import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonitoringTimeRange } from "@/types";

function seed(n: number) {
  return Math.abs(Math.sin(n * 6271 + 28411) * 134456) % 1;
}

const MEMORY_LIMIT_MB = 512;

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
    const wave = Math.sin((i / count) * Math.PI * 4);
    return {
      time: fmt(t),
      "Used (MB)": +(260 + seed(i) * 140 + wave * 40).toFixed(0),
    };
  });
}

interface MemoryChartProps { timeRange: MonitoringTimeRange }

export default function MemoryChart({ timeRange }: MemoryChartProps) {
  const data = useMemo(() => generateData(timeRange), [timeRange]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Memory Usage (MB)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, MEMORY_LIMIT_MB + 64]} unit=" MB" />
              <Tooltip
                contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }}
                formatter={(v: number) => [`${v} MB`]}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine
                y={MEMORY_LIMIT_MB}
                stroke="#ef4444"
                strokeDasharray="5 3"
                label={{ value: `Limit ${MEMORY_LIMIT_MB} MB`, position: "insideTopRight", fontSize: 10, fill: "#ef4444" }}
              />
              <Line type="monotone" dataKey="Used (MB)" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
