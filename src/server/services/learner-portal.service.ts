import { prisma } from "@/server/db";
import { parseState } from "@/server/services/attempt-view";
import { completionRate } from "@/server/services/stats.service";

/** Read-only views for the signed-in learner. Every query is scoped to `learnerId`. */

export type MyAssignment = {
  id: string;
  activityTitle: string;
  activityDescription: string;
  estimatedMinutes: number;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  dueDate: string | null;
  isOverdue: boolean;
  bestScore: number | null;
  /** In-progress attempt, for "Resume" and the continue card. */
  activeAttempt: { id: string; step: number; score: number; startedAt: string } | null;
  /** Most recent completed attempt, for "Review". */
  latestCompletedAttemptId: string | null;
};

export type LearnerHome = {
  firstName: string;
  assignments: MyAssignment[];
  continueAssignment: MyAssignment | null;
  progress: { completed: number; total: number; percent: number | null };
};

export type LearnerProgress = {
  stats: {
    assigned: number;
    completed: number;
    completionRate: number | null;
    averageScore: number | null;
    bestScore: number | null;
    /** Share of all decisions in completed attempts that were good ones. */
    decisionAccuracy: number | null;
  };
  scoreTrend: { attemptId: string; completedAt: string; score: number; activityTitle: string }[];
  history: {
    attemptId: string;
    assignmentId: string;
    activityTitle: string;
    status: "IN_PROGRESS" | "COMPLETED";
    startedAt: string;
    completedAt: string | null;
    score: number;
    actions: number;
  }[];
};

export async function getLearnerHome(learnerId: string, now = new Date()): Promise<LearnerHome> {
  const learner = await prisma.user.findUniqueOrThrow({
    where: { id: learnerId },
    select: {
      name: true,
      assignments: {
        orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { assignedAt: "desc" }],
        include: {
          activity: { select: { title: true, description: true, estimatedMinutes: true } },
          attempts: { orderBy: { startedAt: "desc" } },
        },
      },
    },
  });

  const assignments: MyAssignment[] = learner.assignments.map((assignment) => {
    const active = assignment.attempts.find((attempt) => attempt.completedAt === null) ?? null;
    const completedAttempts = assignment.attempts.filter((attempt) => attempt.completedAt !== null);
    return {
      id: assignment.id,
      activityTitle: assignment.activity.title,
      activityDescription: assignment.activity.description,
      estimatedMinutes: assignment.activity.estimatedMinutes,
      status: assignment.status,
      dueDate: assignment.dueDate?.toISOString() ?? null,
      isOverdue: assignment.status !== "COMPLETED" && assignment.dueDate !== null && assignment.dueDate < now,
      bestScore: completedAttempts.length > 0 ? Math.max(...completedAttempts.map((attempt) => attempt.score)) : null,
      activeAttempt: active
        ? { id: active.id, step: parseState(active.state).step, score: active.score, startedAt: active.startedAt.toISOString() }
        : null,
      latestCompletedAttemptId: completedAttempts[0]?.id ?? null,
    };
  });

  // "Continue where you left off": the in-progress attempt started most recently.
  const continueAssignment =
    assignments
      .filter((assignment) => assignment.activeAttempt !== null)
      .sort((a, b) => b.activeAttempt!.startedAt.localeCompare(a.activeAttempt!.startedAt))[0] ?? null;

  const completed = assignments.filter((assignment) => assignment.status === "COMPLETED").length;
  return {
    firstName: learner.name.split(" ")[0],
    assignments,
    continueAssignment,
    progress: { completed, total: assignments.length, percent: completionRate(completed, assignments.length) },
  };
}

export async function getLearnerProgress(learnerId: string): Promise<LearnerProgress> {
  const assignments = await prisma.assignment.findMany({
    where: { learnerId },
    include: {
      activity: { select: { title: true } },
      attempts: { orderBy: { startedAt: "desc" } },
    },
  });

  const history: LearnerProgress["history"] = assignments
    .flatMap((assignment) =>
      assignment.attempts.map((attempt) => ({
        attemptId: attempt.id,
        assignmentId: assignment.id,
        activityTitle: assignment.activity.title,
        status: (attempt.completedAt ? "COMPLETED" : "IN_PROGRESS") as "IN_PROGRESS" | "COMPLETED",
        startedAt: attempt.startedAt.toISOString(),
        completedAt: attempt.completedAt?.toISOString() ?? null,
        score: attempt.score,
        actions: parseState(attempt.state).step,
      })),
    )
    .sort((a, b) => (b.completedAt ?? b.startedAt).localeCompare(a.completedAt ?? a.startedAt));

  const completedAttempts = assignments.flatMap((assignment) =>
    assignment.attempts
      .filter((attempt) => attempt.completedAt !== null)
      .map((attempt) => ({ attempt, activityTitle: assignment.activity.title })),
  );
  const scores = completedAttempts.map(({ attempt }) => attempt.score);
  const decisions = completedAttempts.flatMap(({ attempt }) => parseState(attempt.state).decisions);
  const goodDecisions = decisions.filter((decision) => decision.correct).length;
  const completed = assignments.filter((assignment) => assignment.status === "COMPLETED").length;

  return {
    stats: {
      assigned: assignments.length,
      completed,
      completionRate: completionRate(completed, assignments.length),
      averageScore: scores.length > 0 ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null,
      bestScore: scores.length > 0 ? Math.max(...scores) : null,
      decisionAccuracy: completionRate(goodDecisions, decisions.length),
    },
    scoreTrend: completedAttempts
      .map(({ attempt, activityTitle }) => ({
        attemptId: attempt.id,
        completedAt: attempt.completedAt!.toISOString(),
        score: attempt.score,
        activityTitle,
      }))
      .sort((a, b) => a.completedAt.localeCompare(b.completedAt)),
    history,
  };
}
