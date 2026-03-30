"use client";

import { useAuthStore } from "@/store/authStore";
import { useLanguagePreference } from "@/hooks/useLanguagePreference";
import { localeFromLanguage, t } from "@/lib/settingsI18n";
import { Sparkles } from "lucide-react";

export default function GreetingHeader() {
  const language = useLanguagePreference();
  const { user } = useAuthStore();
  const today = new Date().toLocaleDateString(localeFromLanguage(language), {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="animate-rise-fade">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/10 border border-cyan-500/20">
          <Sparkles className="h-5 w-5 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t(language, "greeting.welcomeBack", { name: "" })}
            <span className="text-gradient"> {user?.name ?? t(language, "greeting.user")}</span> 👋
          </h1>
          <p className="text-slate-500 mt-0.5 text-sm">{today}</p>
        </div>
      </div>
    </div>
  );
}
