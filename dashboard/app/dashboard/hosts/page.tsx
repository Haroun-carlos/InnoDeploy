import { Suspense } from "react";
import HostsPageClient from "./HostsPageClient";

export default function HostsPage() {
  return (
    <Suspense
      fallback={(
        <div className="min-h-screen bg-[#030711] text-white flex items-center justify-center">
          Loading...
        </div>
      )}
    >
      <HostsPageClient />
    </Suspense>
  );
}
