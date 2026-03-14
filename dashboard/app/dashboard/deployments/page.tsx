"use client";

import DeployActivityChart from "@/components/homepage/DeployActivityChart";
import Sidebar from "@/components/shared/Sidebar";
import Navbar from "@/components/shared/Navbar";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const deploymentStats = [
  { label: "Successful", value: 128 },
  { label: "Failed", value: 7 },
  { label: "In Progress", value: 3 },
];

export default function DeploymentsPage() {
  const isReady = useRequireAuth();

  if (!isReady) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Navbar />
        <main className="flex-1 space-y-6 p-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Deployments</h1>
            <p className="text-sm text-muted-foreground">
              Monitor deployment throughput and release health.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {deploymentStats.map((stat) => (
              <Card key={stat.label}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">{stat.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <DeployActivityChart />
        </main>
      </div>
    </div>
  );
}
