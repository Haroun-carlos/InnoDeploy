"use client";

import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useLanguagePreference } from "@/hooks/useLanguagePreference";
import { t } from "@/lib/settingsI18n";
import Sidebar from "@/components/shared/Sidebar";
import Navbar from "@/components/shared/Navbar";
import RecentPipelinesTable from "@/components/homepage/RecentPipelinesTable";
import { GitBranch } from "lucide-react";

export default function PipelinesPage() {
  const language = useLanguagePreference();
  const isReady = useRequireAuth();

  if (!isReady) return null;

  return (
    <div className="flex min-h-screen bg-[#030711]">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Navbar />
        <main className="relative flex-1 space-y-6 p-6 overflow-hidden">
          {/* Background */}
          <div className="pointer-events-none absolute inset-0 grid-pattern" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(56,189,248,0.06),transparent)]" />

          <div className="relative flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-500/10 border border-sky-500/20">
              <GitBranch className="h-5 w-5 text-sky-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">{t(language, "pipelines.pageTitle")}</h1>
              <p className="text-sm text-slate-500">{t(language, "pipelines.pageSubtitle")}</p>
            </div>
          </div>

          <div className="relative">
            <RecentPipelinesTable />
          </div>
        </main>
      </div>
    </div>
  );
}
