import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  bucketByDay,
  completionRate,
  getCompletionByActivity,
  getKpis,
  getOverdueAssignments,
  type Kpis,
} from "@/server/services/stats.service";
import { createFixtures } from "./helpers/fixtures";

describe("completionRate (pure)", () => {
  it("returns null, never NaN, when there are zero assignments", () => {
    expect(completionRate(0, 0)).toBeNull();
  });

  it("returns a whole-number percentage", () => {
    expect(completionRate(1, 3)).toBe(33);
    expect(completionRate(2, 3)).toBe(67);
    expect(completionRate(3, 3)).toBe(100);
    expect(completionRate(0, 5)).toBe(0);
  });
});

describe("bucketByDay (pure)", () => {
  const now = new Date("2026-03-30T12:00:00Z");

  it("creates one bucket per day, oldest first, ending today", () => {
    const buckets = bucketByDay([], now, 30);
    expect(buckets).toHaveLength(30);
    expect(buckets[0].date).toBe("2026-03-01");
    expect(buckets[29].date).toBe("2026-03-30");
    expect(buckets.every((bucket) => bucket.completions === 0)).toBe(true);
  });

  it("counts dates into their day and ignores dates outside the window", () => {
    const buckets = bucketByDay(
      [new Date("2026-03-30T08:00:00Z"), new Date("2026-03-30T20:00:00Z"), new Date("2026-03-15T10:00:00Z"), new Date("2026-01-01T10:00:00Z")],
      now,
      30,
    );
    expect(buckets.find((b) => b.date === "2026-03-30")?.completions).toBe(2);
    expect(buckets.find((b) => b.date === "2026-03-15")?.completions).toBe(1);
    expect(buckets.reduce((sum, b) => sum + b.completions, 0)).toBe(3);
  });
});

describe("stats.service against the database", () => {
  const fixtures = createFixtures();
  let before: Kpis;
  let after: Kpis;
  let emptyActivityId: string;
  let overdueActiveAssignmentId: string;
  let overdueInactiveAssignmentId: string;

  beforeAll(async () => {
    before = await getKpis();

    const admin = await fixtures.user({ role: "ADMIN", cohort: null });
    const active = await fixtures.user({ name: "Active Test Learner" });
    const activeTwo = await fixtures.user();
    const inactive = await fixtures.user({ status: "INACTIVE" });

    const activity = await fixtures.activity(admin.id);
    const emptyActivity = await fixtures.activity(admin.id, `Empty ${fixtures.runId}`);
    emptyActivityId = emptyActivity.id;

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await fixtures.assignment(activity.id, active.id, { status: "COMPLETED", completedAt: new Date() });
    overdueActiveAssignmentId = (await fixtures.assignment(activity.id, activeTwo.id, { dueDate: yesterday })).id;
    overdueInactiveAssignmentId = (await fixtures.assignment(activity.id, inactive.id, { dueDate: yesterday })).id;

    after = await getKpis();
  });

  afterAll(async () => {
    await fixtures.cleanup();
  });

  it("total learners counts every LEARNER, including inactive (admins excluded)", () => {
    expect(after.totalLearners - before.totalLearners).toBe(3);
  });

  it("active learners counts only ACTIVE learners", () => {
    expect(after.activeLearners - before.activeLearners).toBe(2);
  });

  it("assigned activities ignores assignments of inactive learners", () => {
    expect(after.assignedActivities - before.assignedActivities).toBe(2);
    expect(after.completedAssignments - before.completedAssignments).toBe(1);
  });

  it("completion rate is completed / assigned for active learners", () => {
    expect(after.completionRate).toBe(completionRate(after.completedAssignments, after.assignedActivities));
  });

  it("an activity with zero assignments has a null completion rate", async () => {
    const rows = await getCompletionByActivity();
    const empty = rows.find((row) => row.activityId === emptyActivityId);
    expect(empty).toMatchObject({ assigned: 0, completed: 0, completionRate: null });
  });

  it("needs-attention lists overdue work for active learners only", async () => {
    const overdue = await getOverdueAssignments(new Date(), 500);
    const ids = overdue.map((item) => item.assignmentId);
    expect(ids).toContain(overdueActiveAssignmentId);
    expect(ids).not.toContain(overdueInactiveAssignmentId);
    const item = overdue.find((entry) => entry.assignmentId === overdueActiveAssignmentId);
    expect(item?.daysOverdue).toBeGreaterThanOrEqual(1);
  });
});
