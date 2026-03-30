"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, ArrowRight } from "lucide-react";

export default function TermsGatePage() {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      router.replace("/login");
    }
  }, [router]);

  const handleContinue = () => {
    if (!accepted) {
      setShowError(true);
      return;
    }
    router.replace("/dashboard");
  };

  return (
    <main className="min-h-screen bg-[#030711] text-white relative overflow-hidden">
      {/* Background decorations */}
      <div className="pointer-events-none fixed inset-0 grid-pattern" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(56,189,248,0.08),transparent)]" />
      <div className="pointer-events-none fixed left-1/3 top-1/4 h-[400px] w-[400px] rounded-full bg-cyan-500/[0.03] blur-[100px] animate-orb-float" />
      <div className="pointer-events-none fixed right-1/3 bottom-1/4 h-[350px] w-[350px] rounded-full bg-emerald-500/[0.02] blur-[80px] animate-orb-float-2" />

      <div className="relative flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-md animate-rise-fade">
          {/* Card */}
          <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a1628]/60 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
            {/* Top gradient bar */}
            <div className="h-1 bg-gradient-to-r from-cyan-400 via-emerald-400 to-cyan-400" />

            <div className="p-8 space-y-6">
              {/* Icon */}
              <div className="flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 border border-emerald-500/20">
                  <Shield className="h-7 w-7 text-emerald-400" />
                </div>
              </div>

              {/* Title text */}
              <p className="text-center text-lg leading-7 text-slate-300">
                Our <span className="text-white font-semibold">Terms of Service</span>, <span className="text-white font-semibold">Privacy Notice</span>,
                and <span className="text-white font-semibold">Data Processing Addendum</span> have
                been updated. Please review and accept them before logging in.
              </p>

              {/* Checkbox */}
              <label className="flex items-start gap-3 text-sm text-slate-300 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(event) => {
                    setAccepted(event.target.checked);
                    if (event.target.checked) {
                      setShowError(false);
                    }
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-slate-500/50 bg-transparent accent-cyan-400 cursor-pointer"
                />
                <span className="leading-relaxed">
                  I accepted the updated{" "}
                  <Link href="/" className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300 transition">
                    Terms of Service
                  </Link>
                  ,{" "}
                  <Link href="/" className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300 transition">
                    Privacy Policy
                  </Link>
                  ,{" "}
                  <Link href="/" className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300 transition">
                    Data Processing Addendum
                  </Link>
                </span>
              </label>

              {/* Continue button */}
              <button
                type="button"
                onClick={handleContinue}
                className="group relative h-12 w-full overflow-hidden rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-base font-semibold text-[#030711] transition-all hover:shadow-[0_0_32px_rgba(34,211,238,0.25)]"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Continue
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>

              {/* Error */}
              {showError ? (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-300 backdrop-blur-sm text-center">
                  Please accept our latest Terms of Service and Privacy Policy before logging in.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
