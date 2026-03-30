"use client";

import { useEffect, useState } from "react";

const lines = [
  { text: "$ innodeploy init --project acme-api", color: "text-slate-300", delay: 0 },
  { text: "✓ Project initialized", color: "text-emerald-400", delay: 600 },
  { text: "$ innodeploy deploy --branch main --strategy rolling", color: "text-slate-300", delay: 1200 },
  { text: "⟳ Building container image...", color: "text-cyan-300", delay: 1800 },
  { text: "⟳ Running health checks...", color: "text-cyan-300", delay: 2600 },
  { text: "✓ Deploy successful — 3 replicas healthy", color: "text-emerald-400", delay: 3400 },
  { text: "✓ Route traffic switched (0ms downtime)", color: "text-emerald-400", delay: 4000 },
  { text: "  → https://acme-api.innodeploy.app", color: "text-sky-400", delay: 4400 },
];

export default function TerminalMockup() {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    const timers = lines.map((line, i) =>
      setTimeout(() => setVisibleLines(i + 1), line.delay + 400)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-[680px]">
      {/* Glow behind terminal */}
      <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-cyan-500/10 via-emerald-500/5 to-sky-500/10 blur-2xl" />

      <div className="relative overflow-hidden rounded-xl border border-slate-200/[0.08] bg-[#0a1628]/90 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-slate-200/[0.06] bg-[#0d1d35]/60 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <span className="ml-3 text-[11px] font-medium tracking-wide text-slate-500">
            Terminal — innodeploy
          </span>
        </div>

        {/* Terminal body */}
        <div className="terminal-window p-5 text-[13px] leading-[1.85]">
          {lines.slice(0, visibleLines).map((line, i) => (
            <div key={i} className={`${line.color} animate-slide-in-up`}>
              {line.text}
            </div>
          ))}
          {visibleLines < lines.length && (
            <span className="inline-block h-[18px] w-[8px] translate-y-[2px] bg-cyan-300/80 animate-terminal-blink" />
          )}
          {visibleLines >= lines.length && (
            <div className="mt-1 flex items-center gap-1">
              <span className="text-slate-500">$</span>
              <span className="inline-block h-[18px] w-[8px] translate-y-[2px] bg-cyan-300/80 animate-terminal-blink" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
