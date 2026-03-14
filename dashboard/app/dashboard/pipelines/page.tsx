"use client";

import { useRequireAuth } from "@/hooks/useRequireAuth";
import Sidebar from "@/components/shared/Sidebar";
import Navbar from "@/components/shared/Navbar";
import RecentPipelinesTable from "@/components/homepage/RecentPipelinesTable";

export default function PipelinesPage() {
  const isReady = useRequireAuth();

  if (!isReady) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Navbar />
        <main className="flex-1 space-y-6 p-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Pipelines</h1>
            <p className="text-sm text-muted-foreground">
              Track recent pipeline runs across your projects.
            </p>
          </div>

          <RecentPipelinesTable />
        </main>
      </div>
    </div>
  );
}
