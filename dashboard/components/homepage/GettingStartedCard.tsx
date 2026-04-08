"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Server,
  FolderPlus,
  GitBranch,
  Rocket,
  Check,
  ChevronRight,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { projectApi, hostApi, pipelineApi } from "@/lib/apiClient";
import type { Project, Host } from "@/types";

interface Step {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  done: boolean;
}

export default function GettingStartedCard() {
  const router = useRouter();
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check localStorage for dismissal
    if (typeof window !== "undefined" && localStorage.getItem("innodeploy_onboarding_dismissed") === "1") {
      setDismissed(true);
      return;
    }

    const load = async () => {
      try {
        const [{ data: projectsRes }, { data: hostsRes }] = await Promise.all([
          projectApi.getProjects(),
          hostApi.getHosts(),
        ]);

        const projects = (projectsRes?.projects || []) as Project[];
        const hostsList = (hostsRes?.hosts || hostsRes || []) as Host[];

        let hasPipeline = false;
        let hasDeployment = false;

        if (projects.length > 0) {
          // Check pipelines and deployments for first project
          try {
            const { data } = await pipelineApi.listProjectRuns(projects[0].id);
            hasPipeline = Array.isArray(data?.runs) && data.runs.length > 0;
          } catch { /* noop */ }

          try {
            const { data } = await projectApi.getDeploymentHistory(projects[0].id);
            hasDeployment = Array.isArray(data?.deployments) && data.deployments.length > 0;
          } catch { /* noop */ }
        }

        const stepList: Step[] = [
          {
            key: "host",
            label: "Add a Host",
            description: "Register a server for deployments",
            icon: <Server className="h-4 w-4" />,
            href: "/dashboard/hosts?add=1",
            done: hostsList.length > 0,
          },
          {
            key: "project",
            label: "Create a Project",
            description: "Link your Git repository",
            icon: <FolderPlus className="h-4 w-4" />,
            href: "/dashboard/new-project",
            done: projects.length > 0,
          },
          {
            key: "pipeline",
            label: "Run a Pipeline",
            description: "Build and test your code",
            icon: <GitBranch className="h-4 w-4" />,
            href: "/dashboard/pipelines",
            done: hasPipeline,
          },
          {
            key: "deploy",
            label: "Deploy to Production",
            description: "Ship your first release",
            icon: <Rocket className="h-4 w-4" />,
            href: "/dashboard/projects",
            done: hasDeployment,
          },
        ];

        setSteps(stepList);
      } catch {
        setSteps(null);
      }
    };

    void load();
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("innodeploy_onboarding_dismissed", "1");
  };

  if (dismissed || steps === null) return null;

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;

  // Auto-hide if everything is done
  if (allDone) return null;

  const progress = (completedCount / steps.length) * 100;

  return (
    <section className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/[0.06] to-emerald-500/[0.04] p-5 relative overflow-hidden">
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-colors"
        title="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-5 w-5 text-cyan-400" />
        <h2 className="text-lg font-semibold text-white">Getting Started</h2>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        Complete these steps to set up your deployment pipeline.
      </p>

      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs font-medium text-slate-400 shrink-0">
          {completedCount}/{steps.length}
        </span>
      </div>

      {/* Steps */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <button
            key={step.key}
            onClick={() => !step.done && router.push(step.href)}
            disabled={step.done}
            className={cn(
              "group relative flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
              step.done
                ? "border-emerald-500/20 bg-emerald-500/[0.04] cursor-default"
                : "border-white/[0.08] bg-white/[0.02] hover:border-cyan-500/30 hover:bg-cyan-500/[0.04] cursor-pointer"
            )}
          >
            {/* Step number / check */}
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm font-bold transition-colors",
                step.done
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-white/[0.12] bg-white/[0.04] text-slate-500 group-hover:border-cyan-500/30 group-hover:text-cyan-400"
              )}
            >
              {step.done ? <Check className="h-4 w-4" /> : index + 1}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className={cn("text-sm font-medium", step.done ? "text-emerald-400/80" : "text-slate-200")}>
                  {step.label}
                </span>
                {step.done ? (
                  <span className="text-[10px] text-emerald-500 font-medium">Done</span>
                ) : (
                  <ChevronRight className="h-3 w-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">{step.description}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
