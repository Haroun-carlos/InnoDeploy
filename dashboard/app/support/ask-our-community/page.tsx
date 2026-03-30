import Link from "next/link";
import { MessageCircle, ArrowRight, Users, Lightbulb, Wrench } from "lucide-react";
import SupportNavbar from "@/components/supportpage/SupportNavbar";

const channels = [
  {
    title: "Community Discussions",
    description: "Ask implementation questions and get responses from builders using InnoDeploy every day.",
    icon: Users,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    gradient: "from-cyan-500/20 to-cyan-500/5",
  },
  {
    title: "Show and Tell",
    description: "Share your deployment setup and get feedback on reliability and performance improvements.",
    icon: Lightbulb,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    gradient: "from-emerald-500/20 to-emerald-500/5",
  },
  {
    title: "Tips and Troubleshooting",
    description: "Search previous answers and discover practical fixes for common issues.",
    icon: Wrench,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    gradient: "from-violet-500/20 to-violet-500/5",
  },
];

export default function SupportCommunityPage() {
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
                <MessageCircle className="h-3.5 w-3.5" />
                Community
              </p>

              <h1 className="mt-4 text-4xl font-bold text-white sm:text-5xl">
                Ask our
                <span className="text-gradient"> community</span>
              </h1>
              <p className="mt-3 text-slate-400 leading-relaxed">Learn from other teams, share deployment patterns, and get practical guidance from peers.</p>
            </div>

            {/* Channel cards */}
            <div className="grid gap-4 md:grid-cols-3">
              {channels.map((channel, index) => (
                <article
                  key={channel.title}
                  className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0d1d35]/40 p-5 transition-all duration-300 hover:border-white/[0.12] hover:shadow-[0_0_40px_rgba(0,0,0,0.3)] animate-rise-fade"
                  style={{ animationDelay: `${index * 120}ms` }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${channel.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
                  <div className="relative">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${channel.border} ${channel.bg} mb-4`}>
                      <channel.icon className={`h-5 w-5 ${channel.color}`} />
                    </div>
                    <h2 className="text-lg font-semibold text-white">{channel.title}</h2>
                    <p className="mt-2 text-sm text-slate-400 leading-relaxed">{channel.description}</p>
                  </div>
                </article>
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
                href="/support/faq"
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-6 py-2.5 text-sm font-semibold text-slate-200 backdrop-blur-sm transition-all hover:border-white/[0.15] hover:bg-white/[0.06]"
              >
                View FAQ
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
