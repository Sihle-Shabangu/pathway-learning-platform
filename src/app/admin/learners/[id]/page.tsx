import type { Metadata } from "next";
import { LearnerDetail } from "@/components/admin/learner-detail";
import { requirePageRole } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Learner details" };

export default async function LearnerDetailPage({ params }: PageProps<"/admin/learners/[id]">) {
  await requirePageRole("ADMIN");
  const { id } = await params;
  return <LearnerDetail learnerId={id} />;
}
