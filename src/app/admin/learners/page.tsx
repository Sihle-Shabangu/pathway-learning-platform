import type { Metadata } from "next";
import { LearnersManager } from "@/components/admin/learners-manager";
import { requirePageRole } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Learners" };

export default async function LearnersPage() {
  await requirePageRole("ADMIN");
  return <LearnersManager />;
}
