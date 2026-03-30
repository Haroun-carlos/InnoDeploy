"use client";

import { useRequireAuth } from "@/hooks/useRequireAuth";
import Sidebar from "@/components/shared/Sidebar";
import Navbar from "@/components/shared/Navbar";
import DeployWebApplicationView from "@/components/newprojectpage/DeployWebApplicationView";

export default function NewProjectPage() {
  const isReady = useRequireAuth();

  if (!isReady) return null;

  return (
    <div className="flex min-h-screen bg-[#030711]">
      <Sidebar />

      <div className="flex flex-1 flex-col">
        <Navbar />
        <div className="relative flex-1 overflow-hidden">
          {/* Background */}
          <div className="pointer-events-none absolute inset-0 grid-pattern" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(56,189,248,0.06),transparent)]" />
          <div className="relative">
            <DeployWebApplicationView />
          </div>
        </div>
      </div>
    </div>
  );
}
