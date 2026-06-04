import { Suspense } from "react";
import ProjectsPageClient from "./ProjectsPageClient";

export default function ProjectsPage() {
  return (
    <Suspense
      fallback={(
        <div className="min-h-screen bg-[#030711] text-white flex items-center justify-center">
          Loading...
        </div>
      )}
    >
      <ProjectsPageClient />
    </Suspense>
  );
}
