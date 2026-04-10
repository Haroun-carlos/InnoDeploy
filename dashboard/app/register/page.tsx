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
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [organisationName, setOrganisationName] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryPhone, setRecoveryPhone] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [useCase, setUseCase] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [industry, setIndustry] = useState("");
  const [workspaceType, setWorkspaceType] = useState("");
  const [newsletter, setNewsletter] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const handleOAuth = (provider: "google" | "github") => {
    window.location.href = `${apiBase}/auth/${provider}`;
  };

  const calculatePasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength += 20;
    if (pwd.length >= 12) strength += 20;
    if (/[a-z]/.test(pwd)) strength += 10;
    if (/[A-Z]/.test(pwd)) strength += 10;
    if (/[0-9]/.test(pwd)) strength += 20;
    if (/[!@#$%^&*]/.test(pwd)) strength += 20;
    return Math.min(strength, 100);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordStrength(calculatePasswordStrength(value));
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 30) return "bg-red-500";
    if (passwordStrength < 60) return "bg-orange-500";
    if (passwordStrength < 80) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength < 30) return "Weak";
    if (passwordStrength < 60) return "Fair";
    if (passwordStrength < 80) return "Good";
    return "Strong";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedName = name.trim();
    const trimmedOrg = organisationName.trim();
    
    if (!trimmedName) {
      setError("Full name is required");
      return;
    }
    
    if (!trimmedOrg) {
      setError("Organisation name is required to create your workspace");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== passwordConfirm) {
      setError("Passwords do not match");
      return;
    }

    if (passwordStrength < 30) {
      setError("Password is too weak. Please use a stronger password.");
      return;
    }

    setLoading(true);

    try {
      const { data } = await authApi.register(
        trimmedName,
        email,
        password,
        trimmedOrg,
        recoveryEmail || undefined,
        recoveryPhone || undefined,
        companySize || undefined,
        useCase || undefined,
        referralSource || undefined,
        industry || undefined,
        workspaceType || undefined,
        newsletter
      );
      const res = data as AuthResponse;
      setAuth(res.user, res.accessToken, res.refreshToken);
      router.push("/auth/terms");
    } catch (err: unknown) {
      console.error("Registration error:", err);
      
      // Handle axios error
      const axiosErr = err as { 
        response?: { 
          status?: number;
          data?: { message?: string; error?: string } 
        },
        message?: string;
      };
      
      if (axiosErr.response?.data?.message) {
        setError(axiosErr.response.data.message);
      } else if (axiosErr.response?.data?.error) {
        setError(axiosErr.response.data.error);
      } else if (axiosErr.response?.status === 409) {
        setError("Email already registered");
      } else if (axiosErr.response?.status === 500) {
        setError("Server error. Please try again later.");
      } else if (axiosErr.message) {
        setError(axiosErr.message);
      } else {
        setError("Registration failed. Please try again.");
      }
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
            <form onSubmit={handleSubmit} className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {error && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.06] p-3 text-sm text-rose-300 backdrop-blur-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-300 text-sm">Full name<span className="text-rose-400 ml-1">*</span></Label>
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
                <Label htmlFor="email" className="text-slate-300 text-sm">Email<span className="text-rose-400 ml-1">*</span></Label>
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
                <Label htmlFor="password" className="text-slate-300 text-sm">
                  Password <span className="text-rose-400 ml-1">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  required
                  minLength={8}
                  className="h-11 rounded-xl border-white/[0.08] bg-white/[0.03] text-white placeholder:text-slate-500 placeholder:italic focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition"
                />
                {password && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Strength:</span>
                      <span className={`font-medium ${passwordStrength < 30 ? 'text-red-400' : passwordStrength < 60 ? 'text-orange-400' : passwordStrength < 80 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {getPasswordStrengthText()}
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full transition-all ${getPasswordStrengthColor()}`}
                        style={{ width: `${passwordStrength}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="passwordConfirm" className="text-slate-300 text-sm">
                  Confirm Password <span className="text-rose-400 ml-1">*</span>
                </Label>
                <Input
                  id="passwordConfirm"
                  type="password"
                  placeholder="••••••••"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  required
                  minLength={8}
                  className="h-11 rounded-xl border-white/[0.08] bg-white/[0.03] text-white placeholder:text-slate-500 placeholder:italic focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition"
                />
                {passwordConfirm && password !== passwordConfirm && (
                  <p className="text-xs text-rose-400">Passwords do not match</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="recoveryEmail" className="text-slate-300 text-sm">Recovery Email (for account recovery)</Label>
                <Input
                  id="recoveryEmail"
                  type="email"
                  placeholder="recovery@example.com"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  className="h-11 rounded-xl border-white/[0.08] bg-white/[0.03] text-white placeholder:text-slate-500 placeholder:italic focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition"
                />
                <p className="text-xs text-slate-500">Used to recover your account if primary email is compromised</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recoveryPhone" className="text-slate-300 text-sm">Recovery Phone</Label>
                <Input
                  id="recoveryPhone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={recoveryPhone}
                  onChange={(e) => setRecoveryPhone(e.target.value)}
                  className="h-11 rounded-xl border-white/[0.08] bg-white/[0.03] text-white placeholder:text-slate-500 placeholder:italic focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="org" className="text-slate-300 text-sm">
                  Organisation name <span className="text-rose-400 ml-1">*</span>
                </Label>
                <Input
                  id="org"
                  type="text"
                  placeholder="My Company"
                  value={organisationName}
                  onChange={(e) => setOrganisationName(e.target.value)}
                  required
                  className="h-11 rounded-xl border-white/[0.08] bg-white/[0.03] text-white placeholder:text-slate-500 placeholder:italic focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition"
                />
                <p className="text-xs text-slate-500">Your workspace is created within an organisation</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="workspaceType" className="text-slate-300 text-sm">Workspace Type</Label>
                  <select
                    id="workspaceType"
                    value={workspaceType}
                    onChange={(e) => setWorkspaceType(e.target.value)}
                    className="h-11 w-full rounded-xl border border-white/[0.08] bg-slate-900 text-white placeholder:text-slate-500 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition px-3"
                  >
                    <option value="" className="bg-slate-900 text-white">Select...</option>
                    <option value="startup" className="bg-slate-900 text-white">Startup</option>
                    <option value="enterprise" className="bg-slate-900 text-white">Enterprise</option>
                    <option value="agency" className="bg-slate-900 text-white">Agency</option>
                    <option value="freelance" className="bg-slate-900 text-white">Freelance</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry" className="text-slate-300 text-sm">Industry</Label>
                  <select
                    id="industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="h-11 w-full rounded-xl border border-white/[0.08] bg-slate-900 text-white placeholder:text-slate-500 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition px-3"
                  >
                    <option value="" className="bg-slate-900 text-white">Select...</option>
                    <option value="tech" className="bg-slate-900 text-white">Tech</option>
                    <option value="finance" className="bg-slate-900 text-white">Finance</option>
                    <option value="healthcare" className="bg-slate-900 text-white">Healthcare</option>
                    <option value="retail" className="bg-slate-900 text-white">Retail</option>
                    <option value="manufacturing" className="bg-slate-900 text-white">Manufacturing</option>
                    <option value="education" className="bg-slate-900 text-white">Education</option>
                    <option value="other" className="bg-slate-900 text-white">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="companySize" className="text-slate-300 text-sm">Company Size</Label>
                  <select
                    id="companySize"
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    className="h-11 w-full rounded-xl border border-white/[0.08] bg-slate-900 text-white placeholder:text-slate-500 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition px-3"
                  >
                    <option value="" className="bg-slate-900 text-white">Select...</option>
                    <option value="1-10" className="bg-slate-900 text-white">1-10 people</option>
                    <option value="11-50" className="bg-slate-900 text-white">11-50 people</option>
                    <option value="51-200" className="bg-slate-900 text-white">51-200 people</option>
                    <option value="201-1000" className="bg-slate-900 text-white">201-1000 people</option>
                    <option value="1000+" className="bg-slate-900 text-white">1000+ people</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="useCase" className="text-slate-300 text-sm">Use Case</Label>
                  <select
                    id="useCase"
                    value={useCase}
                    onChange={(e) => setUseCase(e.target.value)}
                    className="h-11 w-full rounded-xl border border-white/[0.08] bg-slate-900 text-white placeholder:text-slate-500 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition px-3"
                  >
                    <option value="" className="bg-slate-900 text-white">Select...</option>
                    <option value="startups" className="bg-slate-900 text-white">Startups</option>
                    <option value="enterprise" className="bg-slate-900 text-white">Enterprise</option>
                    <option value="agencies" className="bg-slate-900 text-white">Agencies</option>
                    <option value="freelance" className="bg-slate-900 text-white">Freelance</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="referralSource" className="text-slate-300 text-sm">How did you find us?</Label>
                <select
                  id="referralSource"
                  value={referralSource}
                  onChange={(e) => setReferralSource(e.target.value)}
                  className="h-11 w-full rounded-xl border border-white/[0.08] bg-slate-900 text-white placeholder:text-slate-500 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition px-3"
                >
                  <option value="" className="bg-slate-900 text-white">Select...</option>
                  <option value="search" className="bg-slate-900 text-white">Search Engine</option>
                  <option value="social-media" className="bg-slate-900 text-white">Social Media</option>
                  <option value="friend-referral" className="bg-slate-900 text-white">Friend Referral</option>
                  <option value="conference" className="bg-slate-900 text-white">Conference/Event</option>
                  <option value="content" className="bg-slate-900 text-white">Blog/Content</option>
                  <option value="other" className="bg-slate-900 text-white">Other</option>
                </select>
              </div>

              <label className="flex items-center gap-3 text-sm text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newsletter}
                  onChange={(e) => setNewsletter(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-500/50 bg-transparent accent-cyan-400 cursor-pointer"
                />
                <span>Subscribe to product updates and announcements</span>
              </label>

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
