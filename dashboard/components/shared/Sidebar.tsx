"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  GitBranch,
  Activity,
  Terminal,
  ShieldAlert,
  Server,
  Settings,
  Rocket,
  UserCog,
  Brain,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useLanguagePreference } from "@/hooks/useLanguagePreference";
import { t } from "@/lib/settingsI18n";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

const navItems = [
  { labelKey: "nav.overview", href: "/dashboard", icon: LayoutDashboard },
  { labelKey: "nav.projects", href: "/dashboard/projects", icon: FolderKanban },
  { labelKey: "nav.hosts", href: "/dashboard/hosts", icon: Server },
  { labelKey: "nav.pipelines", href: "/dashboard/pipelines", icon: GitBranch },
  { labelKey: "Terminal", href: "/dashboard/terminal", icon: Terminal },
  { labelKey: "nav.deployments", href: "/dashboard/deployments", icon: Activity },
  { labelKey: "nav.alerts", href: "/dashboard/alerts", icon: ShieldAlert },
  { labelKey: "AI Monitoring", href: "/dashboard/aiops", icon: Brain },
  { labelKey: "nav.settings", href: "/dashboard/settings", icon: Settings },
];

export default function Sidebar() {
  const language = useLanguagePreference();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const showAdmin = user?.role === "owner" || user?.role === "admin";
  const items = showAdmin
    ? [...navItems, { labelKey: "Admin", href: "/dashboard/admin", icon: UserCog }]
    : navItems;

  useEffect(() => {
    const stored = window.localStorage.getItem("sidebarCollapsed");
    if (stored === "true") {
      setIsCollapsed(true);
    }
  }, []);

  const toggleCollapsed = () => {
    setIsCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("sidebarCollapsed", String(next));
      return next;
    });
  };

  return (
    <aside
      className={cn(
        "hidden md:flex md:flex-col border-r border-white/[0.06] bg-[#040c1b]/90 backdrop-blur-2xl min-h-screen relative overflow-hidden transition-[width] duration-200",
        isCollapsed ? "w-[88px]" : "w-64"
      )}
      data-collapsed={isCollapsed}
    >
      {/* Subtle gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-cyan-500/[0.03] via-transparent to-emerald-500/[0.02]" />

      {/* ── Brand ──────────────────────────────── */}
      <div className="relative flex items-center gap-3 px-6 py-5 border-b border-white/[0.06]">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-400 shadow-[0_0_20px_rgba(34,211,238,0.15)]">
          <Rocket className="h-4 w-4 text-[#030711]" strokeWidth={2.5} />
        </div>
        <span
          className={cn(
            "text-xl font-bold tracking-tight text-white transition-all duration-200",
            isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
          )}
        >
          InnoDeploy
        </span>
        <button
          type="button"
          onClick={toggleCollapsed}
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.02] text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* ── Navigation ─────────────────────────── */}
      <nav className={cn("relative flex-1 px-3 py-4 space-y-1", isCollapsed && "px-2")}>
        {items.map(({ labelKey, href, icon: Icon }) => {
          const isActive = href === "/dashboard"
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
          const label = labelKey === "Admin"
            ? "Admin"
            : labelKey === "Terminal"
              ? "Terminal"
              : t(language, labelKey);
          return (
            <Link
              key={href}
              href={href}
              title={isCollapsed ? label : undefined}
              className={cn(
                "group relative flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isCollapsed ? "justify-center" : "gap-3",
                isActive
                  ? "bg-gradient-to-r from-cyan-500/[0.12] to-emerald-500/[0.06] text-cyan-200 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.12)]"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100"
              )}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-gradient-to-b from-cyan-400 to-emerald-400" />
              )}
              <Icon className={cn("h-4 w-4 transition-colors", isActive ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-300")} />
              <span className={cn("transition-all duration-200", isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100")}>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── Footer ─────────────────────────────── */}
      <div className="relative px-6 py-4 border-t border-white/[0.06]">
        <div className={cn("flex items-center gap-1.5 text-[11px] text-slate-600", isCollapsed && "justify-center")}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          <span className={cn("transition-all duration-200", isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100")}>All systems operational</span>
        </div>
      </div>
    </aside>
  );
}
