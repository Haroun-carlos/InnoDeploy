"use client";

import { useRouter } from "next/navigation";
import { Plus, Rocket, Server } from "lucide-react";
import { useLanguagePreference } from "@/hooks/useLanguagePreference";
import { t } from "@/lib/settingsI18n";

export default function QuickActions() {
  const language = useLanguagePreference();
  const router = useRouter();

  return (
    <div className="flex flex-wrap gap-3">
      <button
        onClick={() => router.push("/dashboard/new-project")}
        className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-5 py-2.5 text-sm font-semibold text-[#030711] transition-all hover:shadow-[0_0_24px_rgba(34,211,238,0.2)] hover:scale-[1.02] active:scale-[0.98]"
      >
        <Plus className="h-4 w-4" />
        {t(language, "quickActions.newProject")}
      </button>
      <button
        onClick={() => router.push("/dashboard/projects")}
        className="group inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-slate-200 backdrop-blur-sm transition-all hover:border-white/[0.15] hover:bg-white/[0.06] hover:shadow-[0_0_20px_rgba(0,0,0,0.2)]"
      >
        <Rocket className="h-4 w-4 text-cyan-400" />
        {t(language, "quickActions.triggerDeploy")}
      </button>
      <button
        onClick={() => router.push("/dashboard/hosts?add=1")}
        className="group inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-slate-200 backdrop-blur-sm transition-all hover:border-white/[0.15] hover:bg-white/[0.06] hover:shadow-[0_0_20px_rgba(0,0,0,0.2)]"
      >
        <Server className="h-4 w-4 text-emerald-400" />
        {t(language, "quickActions.addHost")}
      </button>
    </div>
  );
}
