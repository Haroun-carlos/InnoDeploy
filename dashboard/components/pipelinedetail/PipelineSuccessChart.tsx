"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { projectApi, pipelineApi } from "@/lib/apiClient";
import type { Project } from "@/types";

type DayBucket = { date: string; success: number; failed: number };

export default function PipelineSuccessChart() {
  const [data, setData] = useState<DayBucket[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: projectsRes } = await projectApi.getProjects();
        const projects = (projectsRes?.projects || []) as Project[];

        const bucketSuccess = new Map<string, number>();
        const bucketFailed = new Map<string, number>();

        await Promise.all(
          projects.map(async (project) => {
            try {
              const { data } = await pipelineApi.listProjectRuns(project.id);
              const runs = Array.isArray(data?.runs) ? data.runs : [];
              for (const run of runs) {
                const d = new Date(String(run.createdAt || ""));
                if (Number.isNaN(d.getTime())) continue;
                const key = d.toISOString().slice(0, 10);
                const st = String(run.status || "");
                if (st === "success" || st === "completed") {
                  bucketSuccess.set(key, (bucketSuccess.get(key) || 0) + 1);
                } else if (st === "failed" || st === "cancelled") {
                  bucketFailed.set(key, (bucketFailed.get(key) || 0) + 1);
                }
              }
            } catch { /* skip */ }
          })
        );

        const points: DayBucket[] = [];
        for (let i = 13; i >= 0; i--) {
          const dt = new Date();
          dt.setDate(dt.getDate() - i);
          const key = dt.toISOString().slice(0, 10);
          points.push({
            date: dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            success: bucketSuccess.get(key) || 0,
            failed: bucketFailed.get(key) || 0,
          });
        }
        setData(points);
      } catch {
        setData([]);
      }
    };
    void load();
  }, []);

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#081425]/70 p-5">
      <h3 className="text-base font-semibold text-white mb-4">Pipeline Success vs Failures</h3>
      {data.length === 0 ? (
        <p className="text-sm text-slate-500 py-8 text-center">No pipeline data to chart.</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f1d32",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                fontSize: 12,
                color: "#e2e8f0",
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
            <Bar dataKey="success" fill="#34d399" radius={[4, 4, 0, 0]} name="Success" />
            <Bar dataKey="failed" fill="#f87171" radius={[4, 4, 0, 0]} name="Failed" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
