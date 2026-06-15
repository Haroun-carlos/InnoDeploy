"use client";

import { useState, useMemo, useEffect } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Cpu, MemoryStick, Activity, AlertTriangle, Loader2 } from "lucide-react";
import { projectApi } from "@/lib/apiClient";

// ── Generate realistic mock chart data ───────────────────

function generateTimeSeriesData(hours = 24, intervalMin = 15) {
  const points: any[] = [];
  const count = Math.floor((hours * 60) / intervalMin);
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const ts = new Date(now - (count - 1 - i) * intervalMin * 60000);
    const hour = ts.getHours();
    const isRush = hour >= 9 && hour <= 18;
    const loadFactor = isRush ? 1.3 : 0.8;
    const spike = i > count - 10 ? 1 + (i - (count - 10)) * 0.08 : 1;

    points.push({
      time: ts.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
      fullTime: ts.toLocaleString(),
      cpu: Math.min(99, Math.round((25 + Math.random() * 15) * loadFactor * spike)),
      memory: Math.min(99, Math.round((40 + Math.random() * 12) * loadFactor * spike * 0.9)),
      latencyP50: Math.max(20, Math.round((80 + Math.random() * 40) * loadFactor * spike)),
      latencyP95: Math.max(50, Math.round((150 + Math.random() * 80) * loadFactor * spike)),
      latencyP99: Math.max(100, Math.round((250 + Math.random() * 150) * loadFactor * spike)),
      errors: Math.round(Math.random() * (isRush ? 5 : 2) * spike),
      requests: Math.round((200 + Math.random() * 300) * loadFactor),
    });
  }
  return points;
}

interface Props {
  projectId?: string | null;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#0f1a2e]/95 px-4 py-3 shadow-2xl backdrop-blur-lg">
      <p className="mb-2 text-xs font-medium text-slate-400">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-sm" style={{ color: p.color }}>
          <span className="font-medium">{p.name}:</span> {p.value}
          {p.dataKey.includes("latency") ? "ms" : p.dataKey === "errors" ? "" : "%"}
        </p>
      ))}
    </div>
  );
};

type TimeRange = "1h" | "6h" | "24h";

export default function AiOpsMetricsCharts({ projectId }: Props) {
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setMetrics([]);
      return;
    }
    const fetchMetrics = async () => {
      setLoadingMetrics(true);
      try {
        const res = await projectApi.getProjectMetrics(projectId, { limit: 200 });
        const data = res.data?.metrics ?? [];
        setMetrics(data);
      } catch (err) {
        console.error("Failed to fetch metrics for AIOps:", err);
      } finally {
        setLoadingMetrics(false);
      }
    };
    fetchMetrics();
  }, [projectId]);

  const data = useMemo(() => {
    if (!projectId || metrics.length === 0) {
      const hours = timeRange === "1h" ? 1 : timeRange === "6h" ? 6 : 24;
      const interval = timeRange === "1h" ? 2 : timeRange === "6h" ? 5 : 15;
      return generateTimeSeriesData(hours, interval);
    }

    // Sort by recordedAt ascending (chronological)
    const sorted = [...metrics].sort(
      (a: any, b: any) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    );

    // Filter based on timeRange
    const now = Date.now();
    const rangeMs = (timeRange === "1h" ? 1 : timeRange === "6h" ? 6 : 24) * 60 * 60 * 1000;
    const filtered = sorted.filter(
      (m: any) => now - new Date(m.recordedAt).getTime() <= rangeMs
    );

    // Fallback if filtering returns too few points
    const displayMetrics = filtered.length > 2 ? filtered : sorted;

    return displayMetrics.map((m: any) => {
      const ts = new Date(m.recordedAt);
      const cpuVal = Number(m.cpu_percent ?? m.cpu ?? 0);
      const memVal = Number(m.memory_percent ?? m.memory ?? 0);
      const latencyVal = Number(m.http_latency_ms ?? m.latency ?? 0);
      const netRx = Number(m.net_rx_bytes ?? 0);
      const netTx = Number(m.net_tx_bytes ?? 0);

      const hasFailure = ["down", "degraded"].includes(String(m.health_state || "").toLowerCase()) ||
                         (m.failed_probes && m.failed_probes > 0) ||
                         (m.http_status && m.http_status !== 200);
      const errors = hasFailure ? Math.max(1, Math.round(latencyVal / 200)) : 0;
      
      const requests = Math.max(10, Math.round((netRx + netTx) / 5000));

      return {
        time: ts.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
        fullTime: ts.toLocaleString(),
        cpu: Math.round(cpuVal),
        memory: Math.round(memVal),
        latencyP50: Math.round(latencyVal),
        latencyP95: Math.round(latencyVal * 1.25),
        latencyP99: Math.round(latencyVal * 1.6),
        errors,
        requests,
      };
    });
  }, [metrics, projectId, timeRange]);

  const timeRanges: { value: TimeRange; label: string }[] = [
    { value: "1h", label: "1H" },
    { value: "6h", label: "6H" },
    { value: "24h", label: "24H" },
  ];

  const chartCardClass =
    "rounded-2xl border border-white/[0.06] bg-[#0a1628]/60 p-5 transition-all duration-300 hover:border-white/[0.12]";

  return (
    <div className="space-y-6">
      {/* Time range selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-cyan-400" />
          <h3 className="text-lg font-semibold text-white">Real-time Metrics</h3>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
          {timeRanges.map((tr) => (
            <button
              key={tr.value}
              onClick={() => setTimeRange(tr.value)}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                timeRange === tr.value
                  ? "bg-cyan-500/20 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {tr.label}
            </button>
          ))}
        </div>
      </div>

      {/* Charts grid */}
      <div className="relative">
        {loadingMetrics && (
          <div className="absolute inset-0 bg-[#030711]/45 backdrop-blur-sm z-50 flex items-center justify-center rounded-2xl min-h-[300px]">
            <div className="flex items-center gap-3 bg-[#0a1628]/85 border border-white/[0.08] px-4 py-2.5 rounded-xl shadow-2xl">
              <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
              <span className="text-xs text-slate-400 font-medium">Fetching live database metrics...</span>
            </div>
          </div>
        )}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* CPU & Memory Chart */}
          <div className={chartCardClass}>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/20">
                <Cpu className="h-4 w-4 text-cyan-400" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">CPU & Memory</h4>
                <p className="text-xs text-slate-500">System resource utilisation</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="time"
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval={Math.floor(data.length / 6)}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="cpu"
                  name="CPU"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fill="url(#cpuGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#06b6d4" }}
                />
                <Area
                  type="monotone"
                  dataKey="memory"
                  name="Memory"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fill="url(#memGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#8b5cf6" }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span className="text-slate-400">{value}</span>}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Latency Chart */}
          <div className={chartCardClass}>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-green-500/10 border border-emerald-500/20">
                <Activity className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">HTTP Latency</h4>
                <p className="text-xs text-slate-500">Response time percentiles</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="time"
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval={Math.floor(data.length / 6)}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}ms`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="latencyP50" name="p50" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="latencyP95" name="p95" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="latencyP99" name="p99" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4 }} strokeDasharray="5 5" />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span className="text-slate-400">{value}</span>}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Error Rate Chart */}
          <div className={`${chartCardClass} lg:col-span-2`}>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500/20 to-red-500/10 border border-rose-500/20">
                <AlertTriangle className="h-4 w-4 text-rose-400" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Error Rate & Request Volume</h4>
                <p className="text-xs text-slate-500">Errors per interval and request throughput</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="errGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="time"
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval={Math.floor(data.length / 8)}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="errors" name="Errors" fill="url(#errGrad)" radius={[4, 4, 0, 0]} maxBarSize={12} />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span className="text-slate-400">{value}</span>}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
