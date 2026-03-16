import Link from "next/link";
import { Space_Grotesk } from "next/font/google";
import { Github, Linkedin, MessageCircle, Twitter, Youtube } from "lucide-react";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "700"] });

const footerColumns = [
  {
    title: "Products",
    links: ["Deploy Previews", "Functions", "Agent Runners", "Observability", "Security", "Pricing"],
  },
  {
    title: "Resources",
    links: ["Docs", "Status", "Support", "Developer Guides", "Integrations", "Changelog"],
  },
  {
    title: "Company",
    links: ["About", "Customers", "Partners", "Careers", "Blog", "Press"],
  },
  {
    title: "Contact Us",
    links: ["Sales", "Support", "Status", "Forums"],
  },
];

const legalLinks = ["Trust Center", "Privacy", "GDPR/CCPA", "Abuse", "Cookie Settings"];

export default function HomePage() {
  return (
    <main className={`${spaceGrotesk.className} min-h-screen bg-[#071a3d] text-white`}>
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 sm:px-8">
        <header className="border-b border-blue-100/15">
          <div className="flex flex-wrap items-center justify-between gap-3 py-4">
            <p className="text-xl font-semibold tracking-tight text-blue-100">InnoDeploy</p>
            <div className="flex items-center gap-3">
              <Link
                href="/register"
                className="rounded-full border border-blue-200/30 px-4 py-2 text-sm text-blue-100/90 transition hover:border-blue-200/50 hover:text-white"
              >
                Sign Up
              </Link>
              <Link
                href="/login"
                className="rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-[#04112c] transition hover:bg-blue-50"
              >
                Login
              </Link>
            </div>
          </div>
        </header>

        <section className="relative overflow-hidden border-b border-blue-100/15 py-16 sm:py-24">
          <div
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(191,219,254,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(191,219,254,0.14) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
            }}
          />

          <div
            className="pointer-events-none absolute -bottom-28 left-1/2 h-72 w-full -translate-x-1/2 blur-3xl"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(96,165,250,0.55) 0%, rgba(59,130,246,0.3) 44%, rgba(7,26,61,0) 76%)",
            }}
          />

          <div className="relative mx-auto max-w-4xl text-center">
            <p className="mb-4 text-xs uppercase tracking-[0.28em] text-blue-100/65">Welcome to InnoDeploy</p>
            <h1 className="text-3xl font-bold leading-tight text-blue-50 sm:text-5xl lg:text-6xl">
              Build, Deploy, and Monitor
              <span className="block text-blue-100/85">with one DevOps workspace.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm text-blue-100/80 sm:mt-6 sm:text-lg">
              Launch projects globally, manage hosts, trigger pipelines, and stay ahead of incidents with real-time visibility.
            </p>

            <div className="mt-8 flex w-full flex-col items-stretch justify-center gap-3 sm:mt-10 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
              <Link
                href="/login"
                className="rounded-full bg-blue-100 px-7 py-3 text-center text-sm font-semibold text-[#04112c] transition hover:bg-blue-50"
              >
                Get Started
              </Link>
              <Link
                href="/register"
                className="rounded-full border border-blue-200/35 px-7 py-3 text-center text-sm font-semibold text-blue-100/90 transition hover:border-blue-200/55 hover:text-white"
              >
                Start Deployment
              </Link>
            </div>
          </div>
        </section>

        <section className="border-b border-blue-100/15 py-12 sm:py-14">
          <div className="mx-auto max-w-5xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Platform</p>
            <h2 className="mt-4 max-w-3xl text-3xl font-bold leading-tight text-blue-50 sm:text-5xl lg:text-6xl">
              Everything you need to ship.
              <span className="block text-blue-100/90">Nothing you do not.</span>
            </h2>
            <p className="mt-5 max-w-2xl text-sm text-blue-100/80 sm:mt-6 sm:text-lg">
              From first deploy to scaled production, InnoDeploy handles the infrastructure workflow so your team can focus on building.
            </p>

            <div className="mt-8 grid gap-0 overflow-hidden rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-[#0a3650]/50 via-[#08283f]/50 to-[#081d34]/60 md:mt-10 md:grid-cols-[1.4fr_1fr]">
              <div className="order-2 relative min-h-[270px] border-t border-cyan-200/10 p-6 md:order-1 md:min-h-[360px] md:border-r md:border-t-0 md:p-10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(45,212,191,0.18),transparent_55%)]" />
                <div className="relative mx-auto mt-2 h-[210px] max-w-sm overflow-hidden rounded-2xl border border-cyan-300/35 bg-[#071f34]/70 sm:mt-4 sm:h-[250px] sm:max-w-md">
                  <img
                    src="/images/deployment-simple.svg"
                    alt="Simple deployment workflow visual"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>

              <div className="order-1 p-6 md:order-2 md:p-10">
                <h3 className="text-3xl font-bold text-blue-50 sm:text-4xl">Ship instantly</h3>
                <p className="mt-3 text-sm text-blue-100/80 sm:mt-4 sm:text-base">
                  Deploy from anywhere you build. Every change gets a preview URL and can move to production safely.
                </p>

                <div className="mt-6 space-y-3">
                  <div className="rounded-lg border border-blue-100/20 bg-blue-50/10 px-4 py-3 text-sm text-blue-50">
                    Deploy from anywhere
                  </div>
                  <div className="rounded-lg border border-blue-100/20 bg-blue-50/10 px-4 py-3 text-sm text-blue-50">
                    Instant preview links
                  </div>
                  <div className="rounded-lg border border-blue-100/20 bg-blue-50/10 px-4 py-3 text-sm text-blue-50">
                    Monitor runs and alerts in real time
                  </div>
                </div>

                <Link href="/login" className="mt-7 inline-block text-base font-semibold text-cyan-300 transition hover:text-cyan-200">
                  See the workflow {"->"}
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-blue-100/15 bg-[#061634] py-12 sm:py-16">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
              <p className="text-2xl font-semibold tracking-tight text-cyan-200">InnoDeploy</p>
              <div className="flex items-center gap-3 text-blue-100/70">
                <a href="#" aria-label="GitHub" className="transition hover:text-cyan-200"><Github className="h-4 w-4" /></a>
                <a href="#" aria-label="LinkedIn" className="transition hover:text-cyan-200"><Linkedin className="h-4 w-4" /></a>
                <a href="#" aria-label="Twitter" className="transition hover:text-cyan-200"><Twitter className="h-4 w-4" /></a>
                <a href="#" aria-label="YouTube" className="transition hover:text-cyan-200"><Youtube className="h-4 w-4" /></a>
                <a href="#" aria-label="Community" className="transition hover:text-cyan-200"><MessageCircle className="h-4 w-4" /></a>
              </div>
            </div>

            <div className="grid gap-8 border-b border-blue-100/15 pb-10 sm:grid-cols-2 lg:grid-cols-4">
              {footerColumns.map((column) => (
                <div key={column.title}>
                  <h3 className="text-sm font-semibold text-blue-50">{column.title}</h3>
                  <ul className="mt-3 space-y-2 text-sm text-blue-100/70">
                    {column.links.map((item) => (
                      <li key={item}>
                        <a href="#" className="transition hover:text-cyan-200">
                          {item}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-blue-100/75">Stay up to date with InnoDeploy news</p>
                <div className="mt-3 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                  <input
                    type="email"
                    placeholder="Email address"
                    className="h-11 w-full rounded-lg border border-blue-100/20 bg-[#0b234a] px-4 text-sm text-blue-50 outline-none placeholder:text-blue-100/45 focus:border-cyan-300 sm:w-72"
                  />
                  <button className="h-11 rounded-full bg-cyan-300 px-6 text-sm font-semibold text-[#05203f] transition hover:bg-cyan-200">
                    Subscribe
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-blue-100/15 py-5 text-xs text-blue-100/55">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {legalLinks.map((item) => (
                <a key={item} href="#" className="transition hover:text-cyan-200">
                  {item}
                </a>
              ))}
            </div>
            <p>© 2026 InnoDeploy</p>
          </div>
        </footer>
      </div>
    </main>
  );
}
