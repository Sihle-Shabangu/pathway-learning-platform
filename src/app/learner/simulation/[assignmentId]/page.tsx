import type { Metadata } from "next";
import { Workbench } from "@/components/simulation/workbench";
import { requirePageRole } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Simulation" };

export default async function SimulationPage({ params }: PageProps<"/learner/simulation/[assignmentId]">) {
  await requirePageRole("LEARNER");
  const { assignmentId } = await params;
  return <Workbench assignmentId={assignmentId} />;
}
