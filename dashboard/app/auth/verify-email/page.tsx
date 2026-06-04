import { Suspense } from "react";
import VerifyEmailClient from "./VerifyEmailClient";

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={(
        <div className="min-h-screen bg-[#030711] text-white flex items-center justify-center">
          Loading...
        </div>
      )}
    >
      <VerifyEmailClient />
    </Suspense>
  );
}
