"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Github, Rocket, ArrowRight, CheckCircle2, Boxes, Globe } from "lucide-react";
import { authApi } from "@/lib/apiClient";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuthResponse } from "@/types";

const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none">
      <path d="M21.35 12.23c0-.72-.06-1.25-.2-1.8H12v3.4h5.37c-.1.84-.66 2.1-1.9 2.95l-.02.11 2.77 2.15.2.02c1.81-1.67 2.93-4.11 2.93-6.83Z" fill="#4285F4" />
      <path d="M12 21.75c2.63 0 4.84-.86 6.46-2.35l-3.08-2.39c-.82.57-1.92.96-3.38.96-2.57 0-4.75-1.67-5.53-3.98l-.1.01-2.88 2.23-.03.1A9.75 9.75 0 0 0 12 21.75Z" fill="#34A853" />
      <path d="M6.47 13.99A5.9 5.9 0 0 1 6.14 12c0-.7.12-1.37.32-1.99l-.01-.13-2.92-2.27-.1.05A9.75 9.75 0 0 0 2.25 12c0 1.58.38 3.07 1.18 4.34l3.04-2.35Z" fill="#FBBC05" />
      <path d="M12 6.02c1.85 0 3.1.8 3.82 1.47l2.8-2.74C16.82 3.08 14.63 2.25 12 2.25c-3.82 0-7.23 2.18-8.57 5.4l3.03 2.35c.8-2.31 2.97-3.98 5.54-3.98Z" fill="#EA4335" />
    </svg>
  );
}

const features = [
  {
    icon: Rocket,
    title: "Fast onboarding",
    description: "Create your workspace and run your first deployment in under 2 minutes.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
  },
  {
    icon: Boxes,
    title: "Simple setup",
    description: "Connect hosts, configure secrets, and control environments from one dashboard.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  {
    icon: Globe,
    title: "Global scale",
    description: "Deploy to 50+ edge regions worldwide with automatic SSL and CDN.",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organisationName, setOrganisationName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleOAuth = (provider: "google" | "github") => {
    window.location.href = `${apiBase}/auth/${provider}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Full name is required");
      return;
    }

    setLoading(true);

    try {
      const { data } = await authApi.register(
        trimmedName,
        email,
        password,
        organisationName || undefined
      );
      const res = data as AuthResponse;
      setAuth(res.user, res.accessToken, res.refreshToken);
      router.push("/auth/terms");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#030711] text-white relative overflow-hidden">
      {/* Background decorations */}
      <div className="pointer-events-none fixed inset-0 grid-pattern" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(56,189,248,0.08),transparent)]" />
      <div className="pointer-events-none fixed left-1/4 top-1/4 h-[500px] w-[500px] rounded-full bg-cyan-500/[0.03] blur-[100px] animate-orb-float" />
      <div className="pointer-events-none fixed right-1/4 top-1/3 h-[400px] w-[400px] rounded-full bg-emerald-500/[0.02] blur-[80px] animate-orb-float-2" />

      <div className="relative grid min-h-screen lg:grid-cols-2">
        {/* ── Left: Form ── */}
        <section className="flex items-center justify-center border-b border-white/[0.06] px-6 py-8 lg:border-b-0 lg:border-r">
          <div className="w-full max-w-md space-y-6 animate-rise-fade">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to welcome page
            </Link>

            <div className="text-center lg:text-left">
              <Link href="/" className="inline-block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030711]">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-400 shadow-[0_0_24px_rgba(34,211,238,0.15)]">
                  <Rocket className="h-5 w-5 text-[#030711]" strokeWidth={2.5} />
                </div>
                <h1 className="text-4xl font-bold leading-tight text-white">
                  Create your
                  <span className="block text-gradient">InnoDeploy account</span>
                </h1>
              </Link>
              <p className="mt-3 text-sm text-slate-400">
                Sign up with social auth or create an account with your name and email.
              </p>
            </div>

            {/* Social buttons */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleOAuth("google")}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm font-semibold text-slate-200 backdrop-blur-sm transition-all hover:border-white/[0.15] hover:bg-white/[0.06] hover:shadow-[0_0_20px_rgba(0,0,0,0.2)]"
              >
                <GoogleIcon />
                Sign up with Google
              </button>
              <button
                type="button"
                onClick={() => handleOAuth("github")}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm font-semibold text-slate-200 backdrop-blur-sm transition-all hover:border-white/[0.15] hover:bg-white/[0.06] hover:shadow-[0_0_20px_rgba(0,0,0,0.2)]"
              >
                <Github className="h-4 w-4" />
                Sign up with GitHub
              </button>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/[0.08]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#030711] px-3 text-slate-500 tracking-[0.1em]">Or sign up with email</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {error && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.06] p-3 text-sm text-rose-300 backdrop-blur-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-300 text-sm">Full name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-11 rounded-xl border-white/[0.08] bg-white/[0.03] text-white placeholder:text-slate-500 placeholder:italic focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300 text-sm">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 rounded-xl border-white/[0.08] bg-white/[0.03] text-white placeholder:text-slate-500 placeholder:italic focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300 text-sm">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="h-11 rounded-xl border-white/[0.08] bg-white/[0.03] text-white placeholder:text-slate-500 placeholder:italic focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="org" className="text-slate-300 text-sm">Organisation name (optional)</Label>
                <Input
                  id="org"
                  type="text"
                  placeholder="My Company"
                  value={organisationName}
                  onChange={(e) => setOrganisationName(e.target.value)}
                  className="h-11 rounded-xl border-white/[0.08] bg-white/[0.03] text-white placeholder:text-slate-500 placeholder:italic focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative h-12 w-full overflow-hidden rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-sm font-semibold text-[#030711] transition-all hover:shadow-[0_0_32px_rgba(34,211,238,0.25)] disabled:opacity-60"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? "Creating account..." : "Create account"}
                  {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
                </span>
              </button>
            </form>

            <div className="space-y-2 text-center lg:text-left">
              <p className="text-sm text-slate-400">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-cyan-400 hover:text-cyan-300 transition">
                  Sign in
                </Link>
              </p>
              <p className="text-xs text-slate-600">
                By continuing, you agree to InnoDeploy terms and privacy policy.
              </p>
            </div>
          </div>
        </section>

        {/* ── Right: Features ── */}
        <section className="relative hidden overflow-hidden lg:flex lg:items-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_50%,rgba(45,212,191,0.1),rgba(3,7,17,0)_55%)]" />
          <div className="absolute inset-0 grid-pattern-dense opacity-40" />

          <div className="relative px-16 w-full">
            <div className="max-w-lg space-y-10">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Get Started</p>
                <h2 className="text-4xl font-bold leading-tight text-white">
                  Ship your first deploy
                  <span className="text-gradient"> faster</span>
                </h2>
                <p className="text-base text-slate-400 leading-relaxed">
                  Set up your workspace once, then monitor, deploy, and scale with confidence.
                </p>
              </div>

              <div className="space-y-4">
                {features.map((feature, index) => (
                  <div
                    key={feature.title}
                    className={`group flex items-start gap-4 rounded-2xl border border-white/[0.06] bg-[#0a1628]/50 p-5 transition-all duration-300 hover:border-white/[0.12] hover:bg-[#0d1d35]/70 animate-rise-fade`}
                    style={{ animationDelay: `${(index + 1) * 150}ms` }}
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${feature.border} ${feature.bg}`}>
                      <feature.icon className={`h-5 w-5 ${feature.color}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{feature.title}</p>
                      <p className="mt-1 text-sm text-slate-400 leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Social proof */}
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  Free tier included
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  No credit card
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
