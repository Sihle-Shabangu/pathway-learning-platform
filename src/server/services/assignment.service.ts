import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { notFound, validationError } from "@/server/errors";
import { recordAudit } from "@/server/services/audit.service";

export type AssignInput = {
  activityId: string;
  learnerIds: string[];
  cohort?: string;
  /** "YYYY-MM-DD"; the assignment is due at the end of that day (UTC). */
  dueDate?: string;
};

export type AssignResult = {
  added: number;
  skipped: number;
  targeted: number;
};

/** End of the given calendar day, so "due 12 March" means any time on 12 March. */
export function endOfDayUtc(isoDate: string): Date {
  return new Date(`${isoDate}T23:59:59.999Z`);
}

/**
 * Assigns an activity to the chosen learners and/or every active learner in a cohort.
 * Learners who already have the activity are skipped. Only ACTIVE learners can be assigned.
 */
export async function assignActivity(actorId: string, input: AssignInput): Promise<AssignResult> {
  const activity = await prisma.activity.findUnique({ where: { id: input.activityId }, select: { id: true, title: true } });
  if (!activity) throw notFound("Activity");

  const audience: Prisma.UserWhereInput[] = [];
  if (input.learnerIds.length > 0) audience.push({ id: { in: input.learnerIds } });
  if (input.cohort) audience.push({ cohort: input.cohort });

  const learners = await prisma.user.findMany({
    where: { role: "LEARNER", status: "ACTIVE", OR: audience },
    select: { id: true },
  });
  if (learners.length === 0) {
    throw validationError("No active learners match that selection.", {
      learnerIds: "Choose at least one active learner or a cohort with active learners.",
    });
  }

  const dueDate = input.dueDate ? endOfDayUtc(input.dueDate) : null;

  return prisma.$transaction(async (tx) => {
    // Who doesn't have it yet (recorded in the audit entry).
    const existing = await tx.assignment.findMany({
      where: { activityId: activity.id, learnerId: { in: learners.map((learner) => learner.id) } },
      select: { learnerId: true },
    });
    const alreadyAssigned = new Set(existing.map((row) => row.learnerId));
    const newLearnerIds = learners.map((learner) => learner.id).filter((id) => !alreadyAssigned.has(id));

    // skipDuplicates relies on the unique (activityId, learnerId) index to skip existing assignments.
    const { count } = await tx.assignment.createMany({
      data: learners.map((learner) => ({ activityId: activity.id, learnerId: learner.id, dueDate })),
      skipDuplicates: true,
    });
    const result = { added: count, skipped: learners.length - count, targeted: learners.length };
    await recordAudit(
      {
        actorId,
        action: "assignment.created",
        entityType: "Activity",
        entityId: activity.id,
        metadata: {
          title: activity.title,
          cohort: input.cohort ?? null,
          dueDate: input.dueDate ?? null,
          learnerIds: newLearnerIds, // who actually received it, for the audit trail
          ...result,
        },
      },
      tx,
    );
    return result;
  });
}
