import type { Metadata } from "next";
import { ActivitiesManager } from "@/components/admin/activities-manager";
import { requirePageRole } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Activities" };

export default async function ActivitiesPage() {
  await requirePageRole("ADMIN");
  return <ActivitiesManager />;
}
