import Link from "next/link";
import { CircleHelp, ChevronRight, ArrowRight } from "lucide-react";
import SupportNavbar from "@/components/supportpage/SupportNavbar";

const faqItems = [
  {
    question: "How do I deploy my first app?",
    answer: "Connect your GitHub repository, configure your build settings, and push to deploy.",
  },
  {
    question: "How can I monitor logs and metrics?",
    answer: "Navigate to the dashboard and access real-time monitoring from the overview panel.",
  },
  {
    question: "Can I connect multiple hosts to one project?",
    answer: "Yes, you can add multiple hosts and configure load balancing between them.",
  },
  {
    question: "How do rollbacks work?",
    answer: "Click on any previous deployment and select 'Rollback' to instantly revert.",
  },
  {
    question: "Where can I manage team access and permissions?",
    answer: "Visit Settings → Members to invite, remove, or change roles for team members.",
  },
  {
    question: "How can I contact support quickly?",
    answer: "Use our chat with experts feature or submit a ticket through the support portal.",
  },
];

export default function SupportFaqPage() {
  return (
    <main className="min-h-screen bg-[#030711] text-white relative overflow-hidden">
      {/* Background decorations */}
      <div className="pointer-events-none fixed inset-0 grid-pattern" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(56,189,248,0.08),transparent)]" />
      <div className="pointer-events-none fixed left-1/4 top-1/4 h-[500px] w-[500px] rounded-full bg-cyan-500/[0.03] blur-[100px] animate-orb-float" />
      <div className="pointer-events-none fixed right-1/4 bottom-1/3 h-[400px] w-[400px] rounded-full bg-emerald-500/[0.02] blur-[80px] animate-orb-float-2" />

      <SupportNavbar />

      <section className="relative mx-auto max-w-5xl px-6 py-16 sm:py-20">
        <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a1628]/60 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.3)]">
          {/* Top gradient bar */}
          <div className="h-1 bg-gradient-to-r from-cyan-400 via-emerald-400 to-cyan-400" />

          <div className="p-6 sm:p-8 space-y-8">
            {/* Header */}
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.06] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                <CircleHelp className="h-3.5 w-3.5" />
                Support
              </p>

              <h1 className="mt-4 text-4xl font-bold text-white sm:text-5xl">
                Frequently Asked
                <span className="text-gradient"> Questions</span>
              </h1>
              <p className="mt-3 text-slate-400 leading-relaxed">Find quick answers to common platform and deployment questions.</p>
            </div>

            {/* FAQ items */}
            <div className="space-y-3">
              {faqItems.map((item) => (
                <details key={item.question} className="group rounded-xl border border-white/[0.06] bg-[#0d1d35]/40 transition-all hover:border-white/[0.12]">
                  <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-slate-200 font-medium">
                    <span>{item.question}</span>
                    <ChevronRight className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="px-5 pb-4 text-sm text-slate-400 leading-relaxed">
                    {item.answer}
                  </div>
                </details>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <Link
                href="/support/chat-with-experts"
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-6 py-2.5 text-sm font-semibold text-[#030711] transition-all hover:shadow-[0_0_24px_rgba(34,211,238,0.2)]"
              >
                Chat with experts
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/support/ask-our-community"
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-6 py-2.5 text-sm font-semibold text-slate-200 backdrop-blur-sm transition-all hover:border-white/[0.15] hover:bg-white/[0.06]"
              >
                Ask our community
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
