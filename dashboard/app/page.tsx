import { redirect } from "next/navigation";

/** Root page — redirect to dashboard (login guard handles the rest) */
export default function HomePage() {
  redirect("/dashboard");
}
