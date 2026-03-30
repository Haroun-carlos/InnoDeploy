import Link from "next/link";
import { Headset, ArrowRight, Send } from "lucide-react";
import SupportNavbar from "@/components/supportpage/SupportNavbar";

export default function SupportChatWithExpertsPage() {
  return (
    <main className="min-h-screen bg-[#030711] text-white relative overflow-hidden">
      {/* Background decorations */}
      <div className="pointer-events-none fixed inset-0 grid-pattern" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(56,189,248,0.08),transparent)]" />
      <div className="pointer-events-none fixed left-1/4 top-1/4 h-[500px] w-[500px] rounded-full bg-cyan-500/[0.03] blur-[100px] animate-orb-float" />
      <div className="pointer-events-none fixed right-1/4 bottom-1/3 h-[400px] w-[400px] rounded-full bg-emerald-500/[0.02] blur-[80px] animate-orb-float-2" />

      <SupportNavbar />

      <section className="relative mx-auto max-w-4xl px-6 py-16 sm:py-20">
        <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a1628]/60 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.3)] animate-rise-fade">
          {/* Top gradient bar */}
          <div className="h-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400" />

          <div className="p-6 sm:p-8 space-y-8">
            {/* Header */}
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                <Headset className="h-3.5 w-3.5" />
                Contact
              </p>

              <h1 className="mt-4 text-4xl font-bold text-white sm:text-5xl">
                Chat with
                <span className="text-gradient"> experts</span>
              </h1>
              <p className="mt-3 text-slate-400 leading-relaxed">Tell us what you are building and our team will help with architecture, deployment, and scaling guidance.</p>
            </div>

            {/* Form */}
            <form className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Email</label>
                <input
                  type="email"
                  placeholder="Your email"
                  className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition backdrop-blur-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Subject</label>
                <input
                  type="text"
                  placeholder="Subject"
                  className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition backdrop-blur-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Message</label>
                <textarea
                  rows={6}
                  placeholder="Describe what you need help with"
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition backdrop-blur-sm resize-none"
                />
              </div>

              <button
                type="button"
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-6 py-2.5 text-sm font-semibold text-[#030711] transition-all hover:shadow-[0_0_24px_rgba(34,211,238,0.2)]"
              >
                <Send className="h-4 w-4" />
                Submit request
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </form>

            {/* FAQ link */}
            <div className="pt-2">
              <Link href="/support/faq" className="inline-flex items-center gap-1.5 text-sm font-medium text-cyan-400 transition hover:text-cyan-300">
                Browse FAQ instead
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
