import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";

export type AuditEntry = {
  actorId: string;
  action: string; // e.g. "learner.created", "simulation.completed"
  entityType: string; // e.g. "User", "Assignment"
  entityId: string;
  metadata?: Prisma.InputJsonValue;
};

/** Either the shared client or a transaction client, so audits can join a transaction. */
type Db = Prisma.TransactionClient | typeof prisma;

/** Records one audit entry. Pass `db` (a transaction) to commit it with the change it describes. */
export async function recordAudit(entry: AuditEntry, db: Db = prisma): Promise<void> {
  await db.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      metadata: entry.metadata ?? {},
    },
  });
}
