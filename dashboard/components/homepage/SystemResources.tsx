"use client";

import { useEffect, useState } from "react";
import { Cpu, HardDrive, MemoryStick, Clock, Loader2, Server } from "lucide-react";
import { cn } from "@/lib/utils";
import { projectApi, hostApi } from "@/lib/apiClient";
import type { Project, Host } from "@/types";

interface ResourceData {
  projectName: string;
  cpu: number;
  memory: number;
  uptime: string;
  status: "healthy" | "degraded" | "down";
}

const statusDot = {
  healthy: "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]",
  degraded: "bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.6)]",
  down: "bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.6)]",
};

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all duration-700", color)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function getBarColor(value: number) {
  if (value < 50) return "bg-emerald-400";
  if (value < 75) return "bg-yellow-400";
  return "bg-red-400";
}

export default function SystemResources() {
  const [resources, setResources] = useState<ResourceData[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: projectsRes }, { data: hostsRes }] = await Promise.all([
          projectApi.getProjects(),
          hostApi.getHosts(),
        ]);

        const projects = (projectsRes?.projects || []) as Project[];
        const hostList = (hostsRes?.hosts || hostsRes || []) as Host[];
        setHosts(hostList);

        const items: ResourceData[] = [];

        await Promise.all(
          projects.map(async (project) => {
            try {
              const { data } = await projectApi.getProjectStatus(project.id);
              const metrics = data?.metrics || data || {};

              const cpuVal = parseFloat(String(metrics.cpu || "0").replace("%", ""));
              const memVal = parseFloat(String(metrics.memory || "0").replace("%", ""));
              const uptime = String(metrics.uptime || "—");

              items.push({
                projectName: project.name,
                cpu: isNaN(cpuVal) ? 0 : cpuVal,
                memory: isNaN(memVal) ? 0 : memVal,
                uptime,
                status: project.status === "running" ? "healthy" : project.status === "failed" ? "down" : "degraded",
              });
            } catch {
              items.push({
                projectName: project.name,
                cpu: 0,
                memory: 0,
                uptime: "—",
                status: "degraded",
              });
            }
          })
        );

        setResources(items);
      } catch {
        setResources([]);
        setHosts([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#081425]/70 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Server className="h-5 w-5 text-cyan-300" />
        <h2 className="text-lg font-semibold text-white">System Resources</h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading resources...
        </div>
      ) : resources.length === 0 && hosts.length === 0 ? (
        <div className="text-center py-10 text-sm text-slate-500">
          No projects or hosts to monitor. Add a host or create a project to see resource usage.
        </div>
      ) : (
        <div className="space-y-5">
          {/* Host overview */}
          {hosts.length > 0 && (
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">Hosts</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {hosts.map((host) => (
                  <div
                    key={host.id}
                    className="rounded-xl border border-white/[0.06] bg-[#0a1628]/60 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-200 truncate">{host.hostname}</span>
                      <span className={cn("h-2 w-2 rounded-full", host.status === "online" ? statusDot.healthy : statusDot.down)} />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="flex items-center gap-1"><Cpu className="h-3 w-3" /> CPU</span>
                        <span>{host.cpu ?? 0}%</span>
                      </div>
                      <ProgressBar value={host.cpu ?? 0} color={getBarColor(host.cpu ?? 0)} />

                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="flex items-center gap-1"><MemoryStick className="h-3 w-3" /> Memory</span>
                        <span>{host.memory ?? 0}%</span>
                      </div>
                      <ProgressBar value={host.memory ?? 0} color={getBarColor(host.memory ?? 0)} />

                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" /> Disk</span>
                        <span>{host.disk ?? 0}%</span>
                      </div>
                      <ProgressBar value={host.disk ?? 0} color={getBarColor(host.disk ?? 0)} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-600 pt-1">
                      <span>{host.ip}</span>
                      <span>{host.activeDeployments ?? 0} containers</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per-project resources */}
          {resources.length > 0 && (
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">Projects</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {resources.map((r) => (
                  <div
                    key={r.projectName}
                    className="rounded-xl border border-white/[0.06] bg-[#0a1628]/60 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-200 truncate">{r.projectName}</span>
                      <span className={cn("h-2 w-2 rounded-full", statusDot[r.status])} />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="flex items-center gap-1"><Cpu className="h-3 w-3" /> CPU</span>
                        <span>{r.cpu.toFixed(1)}%</span>
                      </div>
                      <ProgressBar value={r.cpu} color={getBarColor(r.cpu)} />

                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="flex items-center gap-1"><MemoryStick className="h-3 w-3" /> Memory</span>
                        <span>{r.memory.toFixed(1)}%</span>
                      </div>
                      <ProgressBar value={r.memory} color={getBarColor(r.memory)} />
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-600 pt-1">
                      <Clock className="h-3 w-3" />
                      Uptime: {r.uptime}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
