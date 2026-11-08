import { prisma } from "@/server/db";

/*
 * Dashboard metric definitions (also documented in README.md):
 * - Total learners: all users with role LEARNER, including inactive.
 * - Active learners: learners with status ACTIVE.
 * - Assigned activities: count of assignments belonging to active learners.
 * - Completion rate: completed / total assignments, active learners only, as a percentage.
 *   With zero assignments the rate is null (the UI shows "—"), never NaN.
 */

export type Kpis = {
  totalLearners: number;
  activeLearners: number;
  assignedActivities: number;
  completedAssignments: number;
  completionRate: number | null;
};

export type DailyCompletions = { date: string; completions: number };

export type ActivityCompletion = {
  activityId: string;
  title: string;
  assigned: number;
  completed: number;
  completionRate: number | null;
};

export type FeedItem = {
  id: string;
  actorName: string;
  action: string;
  entityType: string;
  metadata: unknown;
  createdAt: string;
};

export type OverdueItem = {
  assignmentId: string;
  learnerId: string;
  learnerName: string;
  activityTitle: string;
  dueDate: string;
  daysOverdue: number;
  status: "NOT_STARTED" | "IN_PROGRESS";
};

export type DashboardData = {
  kpis: Kpis;
  completionsLast30Days: DailyCompletions[];
  completionByActivity: ActivityCompletion[];
  recentActivity: FeedItem[];
  needsAttention: OverdueItem[];
  generatedAt: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const activeLearnerFilter = { learner: { role: "LEARNER", status: "ACTIVE" } } as const;

/** Percentage rounded to a whole number, or null when there is nothing to divide by. */
export function completionRate(completed: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((completed / total) * 100);
}

/** "YYYY-MM-DD" in UTC, used as the bucket key for daily charts. */
export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Builds one bucket per day for the `days` days ending on `now`, oldest first, filled from `dates`. */
export function bucketByDay(dates: Date[], now: Date, days: number): DailyCompletions[] {
  const counts = new Map<string, number>();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    counts.set(dayKey(new Date(now.getTime() - offset * DAY_MS)), 0);
  }
  for (const date of dates) {
    const key = dayKey(date);
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].map(([date, completions]) => ({ date, completions }));
}

export async function getKpis(): Promise<Kpis> {
  const [totalLearners, activeLearners, assignedActivities, completedAssignments] = await Promise.all([
    prisma.user.count({ where: { role: "LEARNER" } }),
    prisma.user.count({ where: { role: "LEARNER", status: "ACTIVE" } }),
    prisma.assignment.count({ where: activeLearnerFilter }),
    prisma.assignment.count({ where: { ...activeLearnerFilter, status: "COMPLETED" } }),
  ]);
  return {
    totalLearners,
    activeLearners,
    assignedActivities,
    completedAssignments,
    completionRate: completionRate(completedAssignments, assignedActivities),
  };
}

/** Assignments completed per day over the last 30 days (all learners: these completions happened). */
export async function getCompletionsLast30Days(now = new Date()): Promise<DailyCompletions[]> {
  const since = new Date(now.getTime() - 30 * DAY_MS);
  const rows = await prisma.assignment.findMany({
    where: { status: "COMPLETED", completedAt: { gte: since } },
    select: { completedAt: true },
  });
  const dates = rows.map((row) => row.completedAt).filter((date): date is Date => date !== null);
  return bucketByDay(dates, now, 30);
}

/** Completion rate per activity, counting only assignments of active learners. */
export async function getCompletionByActivity(): Promise<ActivityCompletion[]> {
  const activities = await prisma.activity.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      title: true,
      assignments: { where: activeLearnerFilter, select: { status: true } },
    },
  });
  return activities.map((activity) => {
    const assigned = activity.assignments.length;
    const completed = activity.assignments.filter((a) => a.status === "COMPLETED").length;
    return {
      activityId: activity.id,
      title: activity.title,
      assigned,
      completed,
      completionRate: completionRate(completed, assigned),
    };
  });
}

/** Latest audit entries, excluding sign-ins and individual simulation steps (too noisy for a feed). */
export async function getRecentActivity(limit = 8): Promise<FeedItem[]> {
  const logs = await prisma.auditLog.findMany({
    where: { action: { notIn: ["auth.login", "simulation.action"] } },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { actor: { select: { name: true } } },
  });
  return logs.map((log) => ({
    id: log.id,
    actorName: log.actor.name,
    action: log.action,
    entityType: log.entityType,
    metadata: log.metadata,
    createdAt: log.createdAt.toISOString(),
  }));
}

/** Overdue = has a due date in the past and is not completed. Active learners only. */
export async function getOverdueAssignments(now = new Date(), limit = 10): Promise<OverdueItem[]> {
  const rows = await prisma.assignment.findMany({
    where: { ...activeLearnerFilter, status: { not: "COMPLETED" }, dueDate: { lt: now } },
    orderBy: { dueDate: "asc" },
    take: limit,
    include: {
      learner: { select: { id: true, name: true } },
      activity: { select: { title: true } },
    },
  });
  return rows.map((row) => ({
    assignmentId: row.id,
    learnerId: row.learner.id,
    learnerName: row.learner.name,
    activityTitle: row.activity.title,
    dueDate: row.dueDate!.toISOString(),
    daysOverdue: Math.max(1, Math.floor((now.getTime() - row.dueDate!.getTime()) / DAY_MS)),
    status: row.status as "NOT_STARTED" | "IN_PROGRESS",
  }));
}

export async function getDashboard(now = new Date()): Promise<DashboardData> {
  const [kpis, completionsLast30Days, completionByActivity, recentActivity, needsAttention] =
    await Promise.all([
      getKpis(),
      getCompletionsLast30Days(now),
      getCompletionByActivity(),
      getRecentActivity(),
      getOverdueAssignments(now),
    ]);
  return {
    kpis,
    completionsLast30Days,
    completionByActivity,
    recentActivity,
    needsAttention,
    generatedAt: now.toISOString(),
  };
}
