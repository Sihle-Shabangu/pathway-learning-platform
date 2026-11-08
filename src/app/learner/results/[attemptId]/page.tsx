import type { Metadata } from "next";
import { ResultsView } from "@/components/simulation/results-view";
import { requirePageRole } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Simulation results" };

export default async function ResultsPage({ params }: PageProps<"/learner/results/[attemptId]">) {
  await requirePageRole("LEARNER");
  const { attemptId } = await params;
  return <ResultsView attemptId={attemptId} />;
}
