import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { requirePageRole } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Admin dashboard" };

export default async function AdminDashboardPage() {
  const user = await requirePageRole("ADMIN");
  return <AdminDashboard adminName={user.name} />;
}
