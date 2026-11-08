import type { Metadata } from "next";
import { requirePageRole } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Home" };

export default async function LearnerDashboardPage() {
  const user = await requirePageRole("LEARNER");
  return (
    <div className="space-y-2">
      <h1 className="text-3xl font-semibold tracking-tight">Hi, {user.name.split(" ")[0]}</h1>
      <p className="text-muted-foreground">
        You are signed in as a learner. Your assigned activities arrive in Phase 4.
      </p>
    </div>
  );
}
