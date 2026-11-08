import type { CreateActivityInput } from "@/lib/validation/activity";
import { prisma } from "@/server/db";
import { recordAudit } from "@/server/services/audit.service";
import { completionRate } from "@/server/services/stats.service";

export type ActivityCard = {
  id: string;
  title: string;
  description: string;
  type: "SIMULATION";
  scenarioKey: string;
  estimatedMinutes: number;
  createdAt: string;
  /** Counts below only include assignments of active learners, matching the dashboard. */
  assigned: number;
  completed: number;
  inProgress: number;
  completionRate: number | null;
  averageScore: number | null;
};

export async function listActivities(): Promise<ActivityCard[]> {
  const activities = await prisma.activity.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      assignments: {
        where: { learner: { status: "ACTIVE" } },
        select: {
          status: true,
          attempts: { where: { completedAt: { not: null } }, select: { score: true } },
        },
      },
    },
  });

  return activities.map((activity) => {
    const assigned = activity.assignments.length;
    const completed = activity.assignments.filter((a) => a.status === "COMPLETED").length;
    const scores = activity.assignments.flatMap((a) => a.attempts.map((attempt) => attempt.score));
    return {
      id: activity.id,
      title: activity.title,
      description: activity.description,
      type: activity.type,
      scenarioKey: activity.scenarioKey,
      estimatedMinutes: activity.estimatedMinutes,
      createdAt: activity.createdAt.toISOString(),
      assigned,
      completed,
      inProgress: activity.assignments.filter((a) => a.status === "IN_PROGRESS").length,
      completionRate: completionRate(completed, assigned),
      averageScore:
        scores.length > 0 ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null,
    };
  });
}

export async function createActivity(actorId: string, input: CreateActivityInput): Promise<{ id: string }> {
  return prisma.$transaction(async (tx) => {
    const activity = await tx.activity.create({
      data: { ...input, type: "SIMULATION", createdById: actorId },
    });
    await recordAudit(
      {
        actorId,
        action: "activity.created",
        entityType: "Activity",
        entityId: activity.id,
        metadata: { title: activity.title },
      },
      tx,
    );
    return { id: activity.id };
  });
}
