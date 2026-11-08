import { prisma } from "@/server/db";

/**
 * Test data helpers. Every record is tagged with a unique run id (in the email, title or cohort)
 * so tests never touch seed data, and cleanup() removes exactly what this run created.
 */
export function createFixtures() {
  const runId = `t${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  const userIds: string[] = [];
  const activityIds: string[] = [];

  async function user(options: {
    role?: "ADMIN" | "LEARNER";
    status?: "ACTIVE" | "INACTIVE";
    cohort?: string | null;
    name?: string;
  } = {}) {
    const index = userIds.length + 1;
    const created = await prisma.user.create({
      data: {
        name: options.name ?? `Test User ${index}`,
        email: `${runId}-${index}@test.invalid`,
        passwordHash: "not-a-real-hash",
        role: options.role ?? "LEARNER",
        status: options.status ?? "ACTIVE",
        cohort: options.cohort === undefined ? `cohort-${runId}` : options.cohort,
      },
    });
    userIds.push(created.id);
    return created;
  }

  async function activity(createdById: string, title = `Activity ${runId}`) {
    const created = await prisma.activity.create({
      data: {
        title,
        description: "Created by an automated test.",
        scenarioKey: "hardware-troubleshooting",
        estimatedMinutes: 10,
        createdById,
      },
    });
    activityIds.push(created.id);
    return created;
  }

  async function assignment(
    activityId: string,
    learnerId: string,
    data: { status?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"; dueDate?: Date | null; completedAt?: Date | null } = {},
  ) {
    return prisma.assignment.create({ data: { activityId, learnerId, ...data } });
  }

  async function cleanup() {
    const assignments = await prisma.assignment.findMany({
      where: { OR: [{ learnerId: { in: userIds } }, { activityId: { in: activityIds } }] },
      select: { id: true },
    });
    const assignmentIds = assignments.map((a) => a.id);
    const attempts = await prisma.simulationAttempt.findMany({
      where: { assignmentId: { in: assignmentIds } },
      select: { id: true },
    });
    const entityIds = [...userIds, ...activityIds, ...assignmentIds, ...attempts.map((a) => a.id)];

    await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: userIds } }, { entityId: { in: entityIds } }] } });
    await prisma.simulationAttempt.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
    await prisma.assignment.deleteMany({ where: { id: { in: assignmentIds } } });
    await prisma.activity.deleteMany({ where: { id: { in: activityIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }

  return { runId, user, activity, assignment, cleanup, userIds, activityIds };
}
