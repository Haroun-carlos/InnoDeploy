"use client";

import Sidebar from "@/components/shared/Sidebar";
import Navbar from "@/components/shared/Navbar";
import InteractiveTerminal from "@/components/shared/InteractiveTerminal";
import CliCommandsSidebar from "@/components/shared/CliCommandsSidebar";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function DashboardTerminalPage() {
  const isReady = useRequireAuth();

  if (!isReady) return null;

  return (
    <div className="flex min-h-screen bg-[#030711]">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Navbar />

        <main className="relative flex-1 p-6 space-y-4 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 grid-pattern" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_-20%,rgba(56,189,248,0.08),transparent)]" />

          <div className="relative">
            <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard Terminal</h1>
            <p className="text-sm text-slate-400">Interactive InnoDeploy CLI terminal. Use the command reference on the left to get started.</p>
          </div>

          <div className="relative rounded-2xl border border-white/[0.08] bg-[#081425]/70 p-4">
            <div className="flex gap-4">
              <div className="w-56 shrink-0 rounded-lg border border-white/[0.06] bg-[#0a1628]/60 p-3" style={{ height: 560 }}>
                <CliCommandsSidebar />
              </div>
              <div className="flex-1 min-w-0">
                <InteractiveTerminal height={560} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
