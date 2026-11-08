import type { Metadata } from "next";
import { AuditLog } from "@/components/admin/audit-log";
import { requirePageRole } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Audit log" };

export default async function AuditPage() {
  await requirePageRole("ADMIN");
  return <AuditLog />;
}
