"use client";

import Link from "next/link";
import { ArrowLeft, Mail, ArrowRight, KeyRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
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
                <h1 className="text-2xl font-bold text-white">Reset your password</h1>
                <p className="text-sm text-slate-400">
                  Enter your email and we&apos;ll send you a reset link.
                </p>
              </div>

              {/* Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-300 text-sm">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      className="h-11 pl-10 rounded-xl border-white/[0.08] bg-white/[0.03] text-white placeholder:text-slate-500 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  className="group relative h-11 w-full overflow-hidden rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-sm font-semibold text-[#030711] transition-all hover:shadow-[0_0_32px_rgba(34,211,238,0.25)]"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Send reset link
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </button>
              </div>

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
