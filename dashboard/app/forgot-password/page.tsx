import { Suspense } from "react";
import ForgotPasswordClient from "./ForgotPasswordClient";

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={(
        <div className="min-h-screen bg-[#030711] text-white flex items-center justify-center">
          Loading...
        </div>
      )}
    >
      <ForgotPasswordClient />
    </Suspense>
  );
}
