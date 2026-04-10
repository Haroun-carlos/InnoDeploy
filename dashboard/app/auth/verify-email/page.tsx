"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader, Mail } from "lucide-react";
import { authApi } from "@/lib/apiClient";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error" | "resend">("loading");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus("error");
        setMessage("No verification token provided");
        return;
      }

      try {
        await authApi.verifyEmail(token);
        setStatus("success");
        setMessage("Email verified successfully! Redirecting to dashboard...");
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      } catch (error: unknown) {
        const axiosErr = error as { response?: { data?: { message?: string } } };
        setStatus("error");
        setMessage(axiosErr.response?.data?.message || "Failed to verify email");
      }
    };

    verifyEmail();
  }, [token, router]);

  const handleResendEmail = async () => {
    if (!email.trim()) {
      setMessage("Please enter your email address");
      return;
    }

    setResendLoading(true);
    try {
      await authApi.resendVerificationEmail(email);
      setMessage("Verification email resent! Check your inbox.");
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { message?: string } } };
      setMessage(axiosErr.response?.data?.message || "Failed to resend verification email");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#030711] text-white relative overflow-hidden flex items-center justify-center px-6">
      {/* Background decorations */}
      <div className="pointer-events-none fixed inset-0 grid-pattern" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(56,189,248,0.08),transparent)]" />
      <div className="pointer-events-none fixed left-1/4 top-1/4 h-[500px] w-[500px] rounded-full bg-cyan-500/[0.03] blur-[100px] animate-orb-float" />

      <div className="w-full max-w-md animate-rise-fade">
        <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a1628]/60 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
          {/* Top gradient bar */}
          <div className="h-1 bg-gradient-to-r from-cyan-400 via-emerald-400 to-cyan-400" />

          <div className="p-8 space-y-6">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 border border-emerald-500/20">
                {status === "loading" && (
                  <Loader className="h-7 w-7 text-cyan-400 animate-spin" />
                )}
                {status === "success" && (
                  <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                )}
                {status === "error" && (
                  <XCircle className="h-7 w-7 text-rose-400" />
                )}
                {status === "resend" && (
                  <Mail className="h-7 w-7 text-cyan-400" />
                )}
              </div>
            </div>

            {/* Content */}
            <div className="space-y-4">
              {status === "loading" && (
                <>
                  <h2 className="text-center text-xl font-semibold text-white">
                    Verifying your email...
                  </h2>
                  <p className="text-center text-sm text-slate-400">
                    Please wait while we verify your email address.
                  </p>
                </>
              )}

              {status === "success" && (
                <>
                  <h2 className="text-center text-xl font-semibold text-white">
                    Email verified!
                  </h2>
                  <p className="text-center text-sm text-slate-400">
                    Your email has been verified successfully. You'll be redirected to your dashboard shortly.
                  </p>
                </>
              )}

              {status === "error" && (
                <>
                  <h2 className="text-center text-xl font-semibold text-white">
                    Verification failed
                  </h2>
                  <p className="text-center text-sm text-rose-300 mb-4">{message}</p>
                  <div className="space-y-3">
                    <p className="text-center text-sm text-slate-400">
                      Would you like us to resend the verification email?
                    </p>
                    <div className="space-y-2">
                      <input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white placeholder:text-slate-500 px-4 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition"
                      />
                      <button
                        onClick={handleResendEmail}
                        disabled={resendLoading}
                        className="w-full h-11 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-sm font-semibold text-[#030711] transition-all hover:shadow-[0_0_32px_rgba(34,211,238,0.25)] disabled:opacity-60"
                      >
                        {resendLoading ? "Sending..." : "Resend verification email"}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Links */}
            <div className="space-y-2 text-center text-sm">
              <Link
                href="/login"
                className="inline-block font-semibold text-cyan-400 hover:text-cyan-300 transition"
              >
                Back to login
              </Link>
              {status === "success" && (
                <>
                  <span className="text-slate-600"> • </span>
                  <Link
                    href="/dashboard"
                    className="inline-block font-semibold text-emerald-400 hover:text-emerald-300 transition"
                  >
                    Go to dashboard
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
