"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertTriangle } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import type { User } from "@/types";

const decodeUserParam = (raw: string): User | null => {
  try {
    const normalized = raw.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json) as User;
  } catch {
    return null;
  }
};

const formatOAuthError = (errorCode: string, reason: string | null) => {
  const normalizedReason = (reason || "").toLowerCase();

  if (errorCode.includes("not_configured")) {
    return "Social login is not configured on the server. Please contact the admin.";
  }

  if (normalizedReason.includes("invalid_client")) {
    return "OAuth app credentials are invalid or no longer active. Please verify Google/GitHub app Client ID and Client Secret.";
  }

  if (errorCode.includes("provider_error")) {
    return `The provider returned an error${reason ? `: ${reason}` : ""}.`;
  }

  if (reason) {
    return `Social login failed: ${reason}.`;
  }

  return "Social login failed. Please try again.";
};

function OAuthCallbackContent() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");
    const encodedUser = params.get("user");
    const callbackError = params.get("error");
    const callbackReason = params.get("reason");
    const mode = params.get("mode");
    const nextPath = params.get("next");

    if (callbackError) {
      setError(formatOAuthError(callbackError, callbackReason));
      return;
    }

    if (!accessToken || !refreshToken || !encodedUser) {
      setError("Login data is missing. Please retry.");
      return;
    }

    const user = decodeUserParam(encodedUser);
    if (!user) {
      setError("Unable to decode user session. Please retry.");
      return;
    }

    setAuth(user, accessToken, refreshToken);
    if (mode === "connect" && nextPath && nextPath.startsWith("/")) {
      router.replace(nextPath);
      return;
    }
    router.replace("/auth/terms");
  }, [router, setAuth]);

  return (
    <main className="min-h-screen bg-[#030711] text-white relative overflow-hidden flex items-center justify-center px-4">
      {/* Background decorations */}
      <div className="pointer-events-none fixed inset-0 grid-pattern" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(56,189,248,0.08),transparent)]" />
      <div className="pointer-events-none fixed left-1/3 top-1/4 h-[400px] w-[400px] rounded-full bg-cyan-500/[0.03] blur-[100px] animate-orb-float" />

      <div className="relative w-full max-w-md animate-rise-fade">
        <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a1628]/60 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
          {/* Top gradient bar */}
          <div className="h-1 bg-gradient-to-r from-cyan-400 via-emerald-400 to-cyan-400" />

          <div className="p-8 text-center space-y-4">
            {error ? (
              <>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20">
                  <AlertTriangle className="h-7 w-7 text-rose-400" />
                </div>
                <h1 className="text-xl font-bold text-white">Authentication Error</h1>
                <p className="text-sm text-slate-400 leading-relaxed">{error}</p>
                <button
                  type="button"
                  onClick={() => router.replace("/login")}
                  className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-6 py-2.5 text-sm font-semibold text-[#030711] transition-all hover:shadow-[0_0_24px_rgba(34,211,238,0.2)]"
                >
                  Back to Login
                </button>
              </>
            ) : (
              <>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                  <Loader2 className="h-7 w-7 animate-spin text-cyan-400" />
                </div>
                <h1 className="text-xl font-bold text-white">Completing sign in...</h1>
                <p className="text-sm text-slate-400">Please wait while we prepare your workspace.</p>

                {/* Progress bar animation */}
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 animate-shimmer" />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#030711] text-white relative overflow-hidden flex items-center justify-center px-4">
          <div className="pointer-events-none fixed inset-0 grid-pattern" />
          <div className="relative w-full max-w-md">
            <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a1628]/60 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
              <div className="h-1 bg-gradient-to-r from-cyan-400 via-emerald-400 to-cyan-400" />
              <div className="p-8 text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                  <Loader2 className="h-7 w-7 animate-spin text-cyan-400" />
                </div>
                <h1 className="text-xl font-bold text-white">Completing sign in...</h1>
                <p className="text-sm text-slate-400">Please wait while we prepare your workspace.</p>
              </div>
            </div>
          </div>
        </main>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  );
}
