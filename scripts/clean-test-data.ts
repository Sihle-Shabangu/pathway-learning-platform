/**
 * Removes data created by automated tests, and nothing else:
 * - unit-test fixture users (emails on the reserved `@test.invalid` domain),
 * - e2e learners (emails like `e2e-<timestamp>@pathway.test`),
 * plus the activities they created and every assignment, attempt and audit entry that hangs off them.
 * Seeded demo data is never matched. Run with: npm run db:clean-tests
 */
import "dotenv/config";
import { prisma } from "../src/server/db";

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { endsWith: "@test.invalid" } },
        { AND: [{ email: { startsWith: "e2e-" } }, { email: { endsWith: "@pathway.test" } }] },
      ],
    },
    select: { id: true },
  });
  const userIds = users.map((user) => user.id);
  if (userIds.length === 0) {
    console.log("No test data found.");
    return;
  }

  const activities = await prisma.activity.findMany({ where: { createdById: { in: userIds } }, select: { id: true } });
  const activityIds = activities.map((activity) => activity.id);
  const assignments = await prisma.assignment.findMany({
    where: { OR: [{ learnerId: { in: userIds } }, { activityId: { in: activityIds } }] },
    select: { id: true },
  });
  const assignmentIds = assignments.map((assignment) => assignment.id);
  const attempts = await prisma.simulationAttempt.findMany({
    where: { assignmentId: { in: assignmentIds } },
    select: { id: true },
  });
  const entityIds = [...userIds, ...activityIds, ...assignmentIds, ...attempts.map((attempt) => attempt.id)];

  const audit = await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { actorId: { in: userIds } },
        { entityId: { in: entityIds } },
        // "assigned X to learners" entries written by an admin record the learners in metadata.learnerIds.
        ...userIds.map((id) => ({
          action: "assignment.created",
          metadata: { path: ["learnerIds"], array_contains: [id] },
        })),
      ],
    },
  });
  const deletedAttempts = await prisma.simulationAttempt.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
  const deletedAssignments = await prisma.assignment.deleteMany({ where: { id: { in: assignmentIds } } });
  const deletedActivities = await prisma.activity.deleteMany({ where: { id: { in: activityIds } } });
  const deletedUsers = await prisma.user.deleteMany({ where: { id: { in: userIds } } });

  console.log("Removed test data:", {
    users: deletedUsers.count,
    activities: deletedActivities.count,
    assignments: deletedAssignments.count,
    attempts: deletedAttempts.count,
    auditLogs: audit.count,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
