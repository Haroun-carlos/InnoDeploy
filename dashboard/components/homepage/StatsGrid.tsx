"use client";

import { useEffect, useState } from "react";
import { FolderKanban, Rocket, HeartPulse, AlertTriangle } from "lucide-react";
import { alertApi, projectApi } from "@/lib/apiClient";
import { useLanguagePreference } from "@/hooks/useLanguagePreference";
import { t } from "@/lib/settingsI18n";
import type { Project, ProjectAlert } from "@/types";

type KpiItem = {
  label: string;
  value: string;
  icon: typeof FolderKanban;
  color: string;
  gradient: string;
  borderColor: string;
};

export default function StatsGrid() {
  const language = useLanguagePreference();
  const [kpis, setKpis] = useState<KpiItem[]>([
    { label: t(language, "stats.totalProjects"), value: "0", icon: FolderKanban, color: "text-blue-400", gradient: "from-blue-500/20 to-blue-500/5", borderColor: "border-blue-500/20" },
    { label: t(language, "stats.runningProjects"), value: "0", icon: Rocket, color: "text-violet-400", gradient: "from-violet-500/20 to-violet-500/5", borderColor: "border-violet-500/20" },
    { label: t(language, "stats.healthyProjects"), value: "0", icon: HeartPulse, color: "text-emerald-400", gradient: "from-emerald-500/20 to-emerald-500/5", borderColor: "border-emerald-500/20" },
    { label: t(language, "stats.openAlerts"), value: "0", icon: AlertTriangle, color: "text-amber-400", gradient: "from-amber-500/20 to-amber-500/5", borderColor: "border-amber-500/20" },
  ]);

  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: projectsRes }, { data: alertsRes }] = await Promise.all([
          projectApi.getProjects(),
          alertApi.getAlerts(),
        ]);

        const projects = (projectsRes?.projects || []) as Project[];
        const alerts = (alertsRes?.alerts || []) as ProjectAlert[];

        const runningProjects = projects.filter((project) => project.status === "running").length;
        const healthyProjects = projects.filter((project) => project.status !== "failed").length;
        const openAlerts = alerts.filter((alert) => alert.status === "open").length;

        setKpis([
          { label: t(language, "stats.totalProjects"), value: String(projects.length), icon: FolderKanban, color: "text-blue-400", gradient: "from-blue-500/20 to-blue-500/5", borderColor: "border-blue-500/20" },
          { label: t(language, "stats.runningProjects"), value: String(runningProjects), icon: Rocket, color: "text-violet-400", gradient: "from-violet-500/20 to-violet-500/5", borderColor: "border-violet-500/20" },
          { label: t(language, "stats.healthyProjects"), value: String(healthyProjects), icon: HeartPulse, color: "text-emerald-400", gradient: "from-emerald-500/20 to-emerald-500/5", borderColor: "border-emerald-500/20" },
          { label: t(language, "stats.openAlerts"), value: String(openAlerts), icon: AlertTriangle, color: "text-amber-400", gradient: "from-amber-500/20 to-amber-500/5", borderColor: "border-amber-500/20" },
        ]);
      } catch {
        setKpis([
          { label: t(language, "stats.totalProjects"), value: "0", icon: FolderKanban, color: "text-blue-400", gradient: "from-blue-500/20 to-blue-500/5", borderColor: "border-blue-500/20" },
          { label: t(language, "stats.runningProjects"), value: "0", icon: Rocket, color: "text-violet-400", gradient: "from-violet-500/20 to-violet-500/5", borderColor: "border-violet-500/20" },
          { label: t(language, "stats.healthyProjects"), value: "0", icon: HeartPulse, color: "text-emerald-400", gradient: "from-emerald-500/20 to-emerald-500/5", borderColor: "border-emerald-500/20" },
          { label: t(language, "stats.openAlerts"), value: "0", icon: AlertTriangle, color: "text-amber-400", gradient: "from-amber-500/20 to-amber-500/5", borderColor: "border-amber-500/20" },
        ]);
      }
    };

    void load();
  }, [language]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map(({ label, value, icon: Icon, color, gradient, borderColor }, index) => (
        <div
          key={label}
          className={`group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a1628]/60 p-5 transition-all duration-300 hover:border-white/[0.12] hover:shadow-[0_0_40px_rgba(0,0,0,0.3)] animate-rise-fade`}
          style={{ animationDelay: `${index * 100}ms` }}
        >
          {/* Gradient background */}
          <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
          {/* Left accent bar */}
          <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-gradient-to-b ${gradient.replace('/20', '/60').replace('/5', '/30')}`} />

          <div className="relative flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">{label}</p>
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${borderColor} bg-white/[0.03] transition group-hover:scale-110`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
          </div>
          <p className="relative mt-3 text-3xl font-bold tracking-tight text-white">{value}</p>
        </div>
      ))}
    </div>
  );
}
