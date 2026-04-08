"use client";

import Link from "next/link";
import { ArrowUpRight, Terminal } from "lucide-react";
import InteractiveTerminal from "@/components/shared/InteractiveTerminal";
import CliCommandsSidebar from "@/components/shared/CliCommandsSidebar";

export default function HomeTerminalPanel() {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#081425]/70 p-4 space-y-3">
      <div className="flex flex-wrap items-end gap-3 justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-cyan-300" />
          <h2 className="text-base font-semibold text-white">InnoDeploy CLI</h2>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/terminal"
            className="inline-flex items-center gap-1 rounded-lg border border-white/[0.12] px-3 py-2 text-xs text-slate-200 hover:bg-white/[0.06]"
          >
            Full terminal
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="w-52 shrink-0 rounded-lg border border-white/[0.06] bg-[#0a1628]/60 p-2" style={{ height: 260 }}>
          <CliCommandsSidebar compact />
        </div>
        <div className="flex-1 min-w-0">
          <InteractiveTerminal height={260} />
        </div>
      </div>
    </section>
  );
}
