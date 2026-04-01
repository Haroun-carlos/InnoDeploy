"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, ArrowRight, KeyRound, CheckCircle, Loader2, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/apiClient";

export default function ForgotPasswordPage() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get("token");
  const emailParam = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailParam);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [error, setError] = useState("");

  const handleForgotSubmit = async () => {
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Something went wrong";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async () => {
    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await authApi.resetPassword(tokenParam!, newPassword);
      setResetDone(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Invalid or expired reset token";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const renderResetForm = () => {
    if (resetDone) {
      return (
        <div className="text-center space-y-4">
          <CheckCircle className="mx-auto h-12 w-12 text-emerald-400" />
          <h2 className="text-xl font-bold text-white">Password Reset</h2>
          <p className="text-sm text-slate-400">Your password has been successfully reset.</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition"
          >
            Go to login <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password" className="text-slate-300 text-sm">New Password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-11 pl-10 rounded-xl border-white/[0.08] bg-white/[0.03] text-white placeholder:text-slate-500 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm" className="text-slate-300 text-sm">Confirm Password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              id="confirm"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-11 pl-10 rounded-xl border-white/[0.08] bg-white/[0.03] text-white placeholder:text-slate-500 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="button"
          onClick={handleResetSubmit}
          disabled={loading}
          className="group relative h-11 w-full overflow-hidden rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-sm font-semibold text-[#030711] transition-all hover:shadow-[0_0_32px_rgba(34,211,238,0.25)] disabled:opacity-60"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset password"}
            {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
          </span>
        </button>
      </div>
    );
  };

  const renderForgotForm = () => {
    if (sent) {
      return (
        <div className="text-center space-y-4">
          <CheckCircle className="mx-auto h-12 w-12 text-emerald-400" />
          <h2 className="text-xl font-bold text-white">Check your email</h2>
          <p className="text-sm text-slate-400">
            If an account with that email exists, we&apos;ve sent a password reset link.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-slate-300 text-sm">Email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 pl-10 rounded-xl border-white/[0.08] bg-white/[0.03] text-white placeholder:text-slate-500 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="button"
          onClick={handleForgotSubmit}
          disabled={loading}
          className="group relative h-11 w-full overflow-hidden rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-sm font-semibold text-[#030711] transition-all hover:shadow-[0_0_32px_rgba(34,211,238,0.25)] disabled:opacity-60"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
            {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
          </span>
        </button>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-[#030711] text-white relative overflow-hidden">
      {/* Background decorations */}
      <div className="pointer-events-none fixed inset-0 grid-pattern" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(56,189,248,0.08),transparent)]" />
      <div className="pointer-events-none fixed left-1/3 top-1/4 h-[400px] w-[400px] rounded-full bg-cyan-500/[0.03] blur-[100px] animate-orb-float" />
      <div className="pointer-events-none fixed right-1/3 bottom-1/4 h-[350px] w-[350px] rounded-full bg-emerald-500/[0.02] blur-[80px] animate-orb-float-2" />

      <div className="relative flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6 animate-rise-fade">
          {/* Card */}
          <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a1628]/60 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
            {/* Top gradient bar */}
            <div className="h-1 bg-gradient-to-r from-cyan-400 via-emerald-400 to-cyan-400" />

            <div className="p-8 space-y-6">
              {/* Icon */}
              <div className="flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/10 border border-cyan-500/20">
                  <KeyRound className="h-7 w-7 text-cyan-400" />
                </div>
              </div>

              {/* Title */}
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-white">
                  {tokenParam ? "Set new password" : "Reset your password"}
                </h1>
                <p className="text-sm text-slate-400">
                  {tokenParam
                    ? "Enter your new password below."
                    : "Enter your email and we'll send you a reset link."}
                </p>
              </div>

              {/* Form */}
              {tokenParam ? renderResetForm() : renderForgotForm()}

              {/* Back link */}
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
