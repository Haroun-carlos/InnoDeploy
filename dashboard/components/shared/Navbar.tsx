"use client";

import { useRouter } from "next/navigation";
import { LogOut, User, Sparkles } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { authApi } from "@/lib/apiClient";
import { useLanguagePreference } from "@/hooks/useLanguagePreference";
import { roleLabel, t } from "@/lib/settingsI18n";
import { Button } from "@/components/ui/button";
import type { MemberRole } from "@/types";

export default function Navbar() {
  const language = useLanguagePreference();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Even if the API call fails, clear local state
    } finally {
      clearAuth();
      router.replace("/login");
    }
  };

  return (
    <header className="relative flex items-center justify-between h-16 px-6 border-b border-white/[0.06] bg-[#040c1b]/80 backdrop-blur-2xl">
      {/* Subtle top highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

      {/* ── Page title area ──────────────────── */}
      <div className="text-lg font-semibold text-white tracking-tight">{t(language, "navbar.dashboard")}</div>

      {/* ── User info + logout ───────────────── */}
      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-3 text-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-white/[0.08]">
              <User className="h-3.5 w-3.5 text-cyan-300" />
            </div>
            <span className="text-slate-200 font-medium">{user.name}</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] bg-gradient-to-r from-cyan-500/[0.12] to-emerald-500/[0.08] text-cyan-300 px-2.5 py-1 rounded-full border border-cyan-400/20">
              <Sparkles className="h-3 w-3" />
              {roleLabel(language, user.role as MemberRole)}
            </span>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-slate-400 hover:bg-white/[0.06] hover:text-white transition-all rounded-lg"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {t(language, "navbar.logout")}
        </Button>
      </div>
    </header>
  );
}
