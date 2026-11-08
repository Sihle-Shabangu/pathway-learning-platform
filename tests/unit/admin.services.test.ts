import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import { assignActivity } from "@/server/services/assignment.service";
import { createLearner, listLearners, updateLearner } from "@/server/services/learner.service";
import { createFixtures } from "./helpers/fixtures";

describe("learner and assignment services", () => {
  const fixtures = createFixtures();
  let adminId: string;
  let cohort: string;

  beforeAll(async () => {
    const admin = await fixtures.user({ role: "ADMIN", cohort: null });
    adminId = admin.id;
    cohort = `cohort-${fixtures.runId}`;
  });

  afterAll(async () => {
    await fixtures.cleanup();
  });

  it("creating a learner with an existing email returns a field error on email", async () => {
    const existing = await fixtures.user();
    const attempt = createLearner(adminId, {
      name: "Duplicate Person",
      email: existing.email,
      cohort,
      password: "password123",
    });
    await expect(attempt).rejects.toBeInstanceOf(AppError);
    await expect(attempt).rejects.toMatchObject({ code: "VALIDATION_ERROR", fields: { email: expect.any(String) } });
  });

  it("creates a learner and writes an audit entry", async () => {
    const email = `${fixtures.runId}-new@test.invalid`;
    const { id } = await createLearner(adminId, { name: "Brand New", email, cohort, password: "password123" });
    fixtures.userIds.push(id);
    const user = await prisma.user.findUniqueOrThrow({ where: { id } });
    expect(user).toMatchObject({ role: "LEARNER", status: "ACTIVE", cohort });
    expect(user.passwordHash).not.toBe("password123");
    const audit = await prisma.auditLog.findFirst({ where: { entityId: id, action: "learner.created" } });
    expect(audit?.actorId).toBe(adminId);
  });

  it("deactivation is a soft delete (status INACTIVE) and is audited", async () => {
    const learner = await fixtures.user();
    await updateLearner(adminId, learner.id, { status: "INACTIVE" });
    const reloaded = await prisma.user.findUnique({ where: { id: learner.id } });
    expect(reloaded?.status).toBe("INACTIVE");
    const audit = await prisma.auditLog.findFirst({ where: { entityId: learner.id, action: "learner.deactivated" } });
    expect(audit).not.toBeNull();
  });

  it("search matches name or email, case-insensitively", async () => {
    await fixtures.user({ name: `Zebedee ${fixtures.runId}` });
    const result = await listLearners({ search: `zebedee ${fixtures.runId}`.toUpperCase(), page: 1, pageSize: 10 });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("assigning skips learners who already have the activity and reports counts", async () => {
    const assignCohort = `assign-${fixtures.runId}`;
    const a = await fixtures.user({ cohort: assignCohort });
    const b = await fixtures.user({ cohort: assignCohort });
    await fixtures.user({ cohort: assignCohort, status: "INACTIVE" }); // never assigned
    const activity = await fixtures.activity(adminId, `Assign ${fixtures.runId}`);

    const first = await assignActivity(adminId, { activityId: activity.id, learnerIds: [a.id] });
    expect(first).toEqual({ added: 1, skipped: 0, targeted: 1 });

    const second = await assignActivity(adminId, { activityId: activity.id, learnerIds: [], cohort: assignCohort, dueDate: "2030-01-31" });
    expect(second).toEqual({ added: 1, skipped: 1, targeted: 2 });

    const rows = await prisma.assignment.findMany({ where: { activityId: activity.id } });
    expect(rows.map((row) => row.learnerId).sort()).toEqual([a.id, b.id].sort());
    expect(rows.find((row) => row.learnerId === b.id)?.dueDate?.toISOString()).toBe("2030-01-31T23:59:59.999Z");
  });
});
