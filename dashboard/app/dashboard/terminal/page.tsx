"use client";

import { useRouter } from "next/navigation";
import Sidebar from "@/components/shared/Sidebar";
import Navbar from "@/components/shared/Navbar";
import InteractiveTerminal from "@/components/shared/InteractiveTerminal";
import CliCommandsSidebar from "@/components/shared/CliCommandsSidebar";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useAuthStore } from "@/store/authStore";
import { ShieldAlert } from "lucide-react";

export default function DashboardTerminalPage() {
  const isReady = useRequireAuth();
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const isViewer = user?.role === "viewer";

  if (!isReady) return null;

  return (
    <div className="flex min-h-screen bg-[#030711]">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Navbar />

        {isViewer ? (
          <div className="relative flex-1 flex items-center justify-center p-6 overflow-hidden">
            {/* Background */}
            <div className="pointer-events-none absolute inset-0 grid-pattern" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(56,189,248,0.06),transparent)]" />
            
            <div className="relative max-w-md w-full overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a1628]/60 backdrop-blur-xl p-8 text-center space-y-6 shadow-2xl animate-rise-fade">
              {/* Top gradient bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-rose-500 to-cyan-500" />
              
              <div className="flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/20 to-orange-500/10 border border-rose-500/20">
                  <ShieldAlert className="h-7 w-7 text-rose-400 animate-pulse" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white tracking-tight">Access Restricted</h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  You do not have permission to access the interactive CLI terminal. 
                  Your current role is <span className="text-cyan-400 font-semibold uppercase">{user?.role}</span> (read-only access).
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-5 py-3 text-sm font-semibold text-[#030711] transition-all hover:shadow-[0_0_24px_rgba(34,211,238,0.2)] hover:scale-[1.02] active:scale-[0.98]"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
