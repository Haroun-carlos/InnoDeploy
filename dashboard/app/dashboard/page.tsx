"use client";

import { useRequireAuth } from "@/hooks/useRequireAuth";
import Sidebar from "@/components/shared/Sidebar";
import Navbar from "@/components/shared/Navbar";
import GreetingHeader from "@/components/homepage/GreetingHeader";
import StatsGrid from "@/components/homepage/StatsGrid";
import RecentPipelinesTable from "@/components/homepage/RecentPipelinesTable";
import ServiceHealthMap from "@/components/homepage/ServiceHealthMap";
import DeployActivityChart from "@/components/homepage/DeployActivityChart";
import AlertsFeed from "@/components/homepage/AlertsFeed";
import QuickActions from "@/components/homepage/QuickActions";
import HomeTerminalPanel from "@/components/homepage/HomeTerminalPanel";
import GettingStartedCard from "@/components/homepage/GettingStartedCard";
import RecentDeployments from "@/components/homepage/RecentDeployments";
import SystemResources from "@/components/homepage/SystemResources";
import ActivityTimeline from "@/components/homepage/ActivityTimeline";

export default function DashboardPage() {
  const isReady = useRequireAuth();

  if (!isReady) return null;

  return (
    <div className="flex min-h-screen bg-[#030711]">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Navbar />

        <main className="relative flex-1 p-6 space-y-6 overflow-hidden">
          {/* Background decorations */}
          <div className="pointer-events-none absolute inset-0 grid-pattern" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(56,189,248,0.06),transparent)]" />

          <div className="relative">
            <GreetingHeader />
          </div>

          {/* Getting Started — auto-hides once all steps are complete */}
          <div className="relative">
            <GettingStartedCard />
          </div>

          <div className="relative">
            <StatsGrid />
          </div>
          <div className="relative">
            <QuickActions />
          </div>

          <div className="relative">
            <HomeTerminalPanel />
          </div>

          {/* Recent Deployments */}
          <div className="relative">
            <RecentDeployments />
          </div>

          <div className="relative grid gap-6 lg:grid-cols-2">
            <DeployActivityChart />
            <ServiceHealthMap />
          </div>

          {/* System Resources & Activity Timeline side by side */}
          <div className="relative grid gap-6 lg:grid-cols-2">
            <SystemResources />
            <ActivityTimeline />
          </div>

          <div className="relative">
            <RecentPipelinesTable />
          </div>
          <div className="relative">
            <AlertsFeed />
          </div>
        </main>
      </div>
    </div>
  );
}
