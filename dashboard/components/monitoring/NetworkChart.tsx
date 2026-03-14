"use client";

import { useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonitoringTimeRange } from "@/types";

function seed(n: number) {
  return Math.abs(Math.sin(n * 7321 + 39119) * 176419) % 1;
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
    return {
      time: fmt(t),
      "In (KB/s)":  +(80 + seed(i) * 200).toFixed(1),
      "Out (KB/s)": +(40 + seed(i + 40) * 100).toFixed(1),
    };
  });
}

interface NetworkChartProps { timeRange: MonitoringTimeRange }

export default function NetworkChart({ timeRange }: NetworkChartProps) {
  const data = useMemo(() => generateData(timeRange), [timeRange]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Network I/O (KB/s)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="netIn"  x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="netOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} unit=" KB/s" />
              <Tooltip
                contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }}
                formatter={(v: number) => [`${v} KB/s`]}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="In (KB/s)"  stroke="#6366f1" fill="url(#netIn)"  strokeWidth={2} />
              <Area type="monotone" dataKey="Out (KB/s)" stroke="#f59e0b" fill="url(#netOut)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
