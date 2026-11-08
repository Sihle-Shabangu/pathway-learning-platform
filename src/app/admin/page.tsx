import type { Metadata } from "next";
import { requirePageRole } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Admin dashboard" };

export default async function AdminDashboardPage() {
  const user = await requirePageRole("ADMIN");
  return (
    <div className="space-y-2">
      <h1 className="text-3xl font-semibold tracking-tight">Welcome, {user.name}</h1>
      <p className="text-muted-foreground">
        You are signed in as an administrator. The dashboard metrics arrive in Phase 2.
      </p>
    </div>
  );
}
