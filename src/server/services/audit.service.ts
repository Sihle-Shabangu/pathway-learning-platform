import type { Prisma } from "@/generated/prisma/client";
import type { AuditQuery } from "@/lib/validation/audit";
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

export type AuditRow = {
  id: string;
  actorName: string;
  actorEmail: string;
  actorRole: "ADMIN" | "LEARNER";
  action: string;
  entityType: string;
  entityId: string;
  metadata: unknown;
  createdAt: string;
};

export type AuditPage = {
  items: AuditRow[];
  total: number;
  page: number;
  pageSize: number;
  /** Every action that appears in the log, for the filter dropdown. */
  actions: string[];
};

/** Newest first, filtered by action, actor (name or email) and an inclusive UTC date range. */
export async function listAuditLogs(query: AuditQuery): Promise<AuditPage> {
  const where: Prisma.AuditLogWhereInput = {};
  if (query.action) where.action = query.action;
  if (query.actor) {
    where.actor = {
      OR: [
        { name: { contains: query.actor, mode: "insensitive" } },
        { email: { contains: query.actor, mode: "insensitive" } },
      ],
    };
  }
  if (query.from || query.to) {
    where.createdAt = {
      ...(query.from ? { gte: new Date(`${query.from}T00:00:00.000Z`) } : {}),
      ...(query.to ? { lte: new Date(`${query.to}T23:59:59.999Z`) } : {}),
    };
  }

  const [total, logs, actionRows] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: { actor: { select: { name: true, email: true, role: true } } },
    }),
    prisma.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
  ]);

  return {
    items: logs.map((log) => ({
      id: log.id,
      actorName: log.actor.name,
      actorEmail: log.actor.email,
      actorRole: log.actor.role,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      metadata: log.metadata,
      createdAt: log.createdAt.toISOString(),
    })),
    total,
    page: query.page,
    pageSize: query.pageSize,
    actions: actionRows.map((row) => row.action),
  };
}
