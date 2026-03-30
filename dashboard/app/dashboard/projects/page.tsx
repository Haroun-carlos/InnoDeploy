"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, FolderKanban } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import Sidebar from "@/components/shared/Sidebar";
import Navbar from "@/components/shared/Navbar";
import SearchBar from "@/components/projectpage/SearchBar";
import FilterChips from "@/components/projectpage/FilterChips";
import ProjectCard from "@/components/projectpage/ProjectCard";
import CreateProjectModal from "@/components/projectpage/CreateProjectModal";
import { useLanguagePreference } from "@/hooks/useLanguagePreference";
import { projectApi } from "@/lib/apiClient";
import { t } from "@/lib/settingsI18n";
import type { Project, ProjectStatus } from "@/types";

export default function ProjectsPage() {
  const language = useLanguagePreference();
  const isReady = useRequireAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ProjectStatus | "all">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (!isReady) return;

    const loadProjects = async () => {
      try {
        const { data } = await projectApi.getProjects();
        setProjects(Array.isArray(data?.projects) ? data.projects : []);
      } catch {
        setProjects([]);
      }
    };

    void loadProjects();
  }, [isReady]);

  useEffect(() => {
    if (!isReady) return;
    if (searchParams.get("new") === "1") {
      router.replace("/dashboard/new-project");
    }
  }, [isReady, searchParams, router]);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch = p.name
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesFilter = filter === "all" || p.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [projects, search, filter]);

  if (!isReady) return null;

  return (
    <div className="flex min-h-screen bg-[#030711]">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Navbar />

        <main className="relative flex-1 p-6 space-y-6 overflow-hidden">
          {/* Background */}
          <div className="pointer-events-none absolute inset-0 grid-pattern" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(56,189,248,0.06),transparent)]" />

          {/* Header row */}
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 border border-violet-500/20">
                <FolderKanban className="h-5 w-5 text-violet-400" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">{t(language, "projects.pageTitle")}</h1>
            </div>
            <button
              onClick={() => router.push("/dashboard/new-project")}
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-5 py-2.5 text-sm font-semibold text-[#030711] transition-all hover:shadow-[0_0_24px_rgba(34,211,238,0.2)] hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              {t(language, "projects.create")}
            </button>
          </div>

          {/* Search + Filters */}
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
            <SearchBar value={search} onChange={setSearch} />
            <FilterChips active={filter} onChange={setFilter} />
          </div>

          {/* Project grid */}
          {filteredProjects.length === 0 ? (
            <div className="relative text-center py-16 rounded-2xl border border-white/[0.06] bg-[#0a1628]/40">
              <FolderKanban className="mx-auto h-10 w-10 text-slate-600 mb-3" />
              <p className="text-slate-500">{t(language, "projects.none")}</p>
            </div>
          ) : (
            <div className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(project) =>
          setProjects((prev) => [project, ...prev])
        }
      />
    </div>
  );
}
