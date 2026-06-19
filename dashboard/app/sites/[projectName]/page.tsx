import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, Globe, ArrowLeft, Clock3 } from "lucide-react";

type PublicProject = {
  name: string;
  description?: string;
  repoUrl?: string;
  branch?: string;
  status?: "running" | "stopped" | "failed";
  lastDeployAt?: string | null;
  envCount?: number;
  publicUrl?: string;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const statusStyles: Record<NonNullable<PublicProject["status"]>, { label: string; className: string }> = {
  running: { label: "Running", className: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20" },
  stopped: { label: "Stopped", className: "bg-amber-500/15 text-amber-300 border-amber-400/20" },
  failed: { label: "Failed", className: "bg-rose-500/15 text-rose-300 border-rose-400/20" },
};

const formatDate = (value?: string | null) => {
  if (!value) return "Never deployed";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never deployed";
  return date.toLocaleString();
};

async function getProject(projectName: string): Promise<PublicProject | null> {
  const response = await fetch(`${apiBaseUrl}/projects/public/sites/${encodeURIComponent(projectName)}`, {
    cache: "no-store",
  });

  if (!response.ok) return null;
  const data = (await response.json()) as { project?: PublicProject };
  return data.project ?? null;
}

export default async function ProjectSitePage({ params }: { params: Promise<{ projectName: string }> }) {
  const { projectName: rawProjectName } = await params;
  const projectName = decodeURIComponent(rawProjectName || "");
  const project = await getProject(projectName);

  if (project?.publicUrl) {
    redirect(project.publicUrl);
  }

  const status = project?.status ? statusStyles[project.status] : null;

  return (
    <main className="min-h-screen bg-[#050B16] text-white">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -left-20 top-16 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute right-0 top-40 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_40%)]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <Link
          href="/dashboard"
          className="mb-10 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 backdrop-blur transition hover:border-white/20 hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-cyan-950/20 backdrop-blur">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-cyan-200">
              <Globe className="h-3.5 w-3.5" />
              Hosted site
            </div>

            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              {project?.name || projectName || "Project site"}
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              {project?.description || "This deployment endpoint is now live and ready to serve project-specific content."}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {status && (
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${status.className}`}>
                  {status.label}
                </span>
              )}
              {project?.branch && (
                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-medium text-slate-200">
                  Branch: {project.branch}
                </span>
              )}
              {typeof project?.envCount === "number" && (
                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-medium text-slate-200">
                  Environments: {project.envCount}
                </span>
              )}
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Last deploy</div>
                <div className="mt-2 flex items-center gap-2 text-slate-100">
                  <Clock3 className="h-4 w-4 text-cyan-300" />
                  {formatDate(project?.lastDeployAt)}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Repository</div>
                {project?.repoUrl ? (
                  <a
                    href={project.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 flex items-center gap-2 text-slate-100 transition hover:text-cyan-300"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open repository
                  </a>
                ) : (
                  <div className="mt-2 text-slate-400">Repository unavailable</div>
                )}
              </div>
            </div>
          </section>

          <aside className="rounded-3xl border border-white/10 bg-[#081425]/90 p-6 backdrop-blur">
            <h2 className="text-lg font-semibold">Deployment details</h2>
            <div className="mt-4 space-y-4 text-sm text-slate-300">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Public endpoint</div>
                <div className="mt-2 break-all text-slate-100">/sites/{projectName}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">What you are seeing</div>
                <p className="mt-2 leading-6 text-slate-300">
                  This page replaces the previous 404 response for the current project route and can be extended to show the deployed application.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}