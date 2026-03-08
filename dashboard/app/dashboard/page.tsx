"use client";

import { useAuthStore } from "@/store/authStore";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FolderKanban, GitBranch, Activity, Users } from "lucide-react";

/** Overview stat cards shown on the main dashboard */
const stats = [
  { label: "Projects", value: "0", icon: FolderKanban, color: "text-blue-500" },
  { label: "Pipelines", value: "0", icon: GitBranch, color: "text-violet-500" },
  { label: "Deployments", value: "0", icon: Activity, color: "text-emerald-500" },
  { label: "Team Members", value: "1", icon: Users, color: "text-amber-500" },
];

export default function DashboardPage() {
  const isReady = useRequireAuth();
  const { user } = useAuthStore();

  if (!isReady) return null; // wait for auth check

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Navbar />

        <main className="flex-1 p-6 space-y-6">
          {/* ── Welcome banner ──────────────────── */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, {user?.name ?? "User"} 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Here&apos;s an overview of your InnoDeploy workspace.
            </p>
          </div>

          {/* ── Stats grid ──────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map(({ label, value, icon: Icon, color }) => (
              <Card key={label}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardDescription>{label}</CardDescription>
                  <Icon className={`h-5 w-5 ${color}`} />
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-3xl">{value}</CardTitle>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── Recent activity placeholder ──────── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <CardDescription>
                Your latest pipeline runs and deployments will appear here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                No activity yet — create your first project to get started.
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
