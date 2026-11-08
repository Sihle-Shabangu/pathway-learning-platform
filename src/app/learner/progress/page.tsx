import type { Metadata } from "next";
import { MyProgress } from "@/components/learner/my-progress";
import { requirePageRole } from "@/server/auth/guards";

export const metadata: Metadata = { title: "My progress" };

export default async function MyProgressPage() {
  await requirePageRole("LEARNER");
  return <MyProgress />;
}
