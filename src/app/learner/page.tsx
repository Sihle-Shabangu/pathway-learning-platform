import type { Metadata } from "next";
import { LearnerDashboard } from "@/components/learner/learner-dashboard";
import { requirePageRole } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Home" };

export default async function LearnerDashboardPage() {
  await requirePageRole("LEARNER");
  return <LearnerDashboard />;
}
