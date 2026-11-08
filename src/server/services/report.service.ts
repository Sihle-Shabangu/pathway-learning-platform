import { toCsv } from "@/lib/csv";
import { faultLabel } from "@/lib/simulation/scenarios/catalog";
import { prisma } from "@/server/db";
import { notFound } from "@/server/errors";
import { parseState } from "@/server/services/attempt-view";

export type CsvFile = { filename: string; content: string };

const isoOrEmpty = (date: Date | null | undefined) => (date ? date.toISOString() : "");
const dayStamp = (now: Date) => now.toISOString().slice(0, 10);

/** Filename-safe version of a name: "Sipho Ndlovu" -> "sipho-ndlovu". */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * One learner's report: one row per attempt (or one row per assignment with no attempts yet).
 * The fault is included only for completed attempts, matching the rest of the app.
 */
export async function learnerReportCsv(learnerId: string, now = new Date()): Promise<CsvFile> {
  const learner = await prisma.user.findFirst({
    where: { id: learnerId, role: "LEARNER" },
    include: {
      assignments: {
        orderBy: { assignedAt: "asc" },
        include: { activity: { select: { title: true } }, attempts: { orderBy: { startedAt: "asc" } } },
      },
    },
  });
  if (!learner) throw notFound("Learner");

  const headers = [
    "Learner",
    "Email",
    "Cohort",
    "Activity",
    "Assignment status",
    "Due date",
    "Attempt started",
    "Attempt completed",
    "Score",
    "Actions taken",
    "Good decisions",
    "Costly decisions",
    "Hidden fault",
  ];

  const rows = learner.assignments.flatMap((assignment) => {
    const base = [learner.name, learner.email, learner.cohort, assignment.activity.title, assignment.status, isoOrEmpty(assignment.dueDate)];
    if (assignment.attempts.length === 0) return [[...base, "", "", "", "", "", "", ""]];
    return assignment.attempts.map((attempt) => {
      const state = parseState(attempt.state);
      const good = state.decisions.filter((decision) => decision.correct).length;
      const completed = attempt.completedAt !== null;
      return [
        ...base,
        isoOrEmpty(attempt.startedAt),
        isoOrEmpty(attempt.completedAt),
        completed ? attempt.score : "",
        state.step,
        good,
        state.decisions.length - good,
        completed ? faultLabel(state.faultId) : "",
      ];
    });
  });

  return { filename: `pathway-${slugify(learner.name)}-report-${dayStamp(now)}.csv`, content: toCsv(headers, rows) };
}

/** All learners' results: one row per learner per assignment, including inactive learners (marked as such). */
export async function allResultsCsv(now = new Date()): Promise<CsvFile> {
  const learners = await prisma.user.findMany({
    where: { role: "LEARNER" },
    orderBy: [{ cohort: "asc" }, { name: "asc" }],
    include: {
      assignments: {
        orderBy: { assignedAt: "asc" },
        include: {
          activity: { select: { title: true } },
          attempts: { where: { completedAt: { not: null } }, select: { score: true } },
        },
      },
    },
  });

  const headers = [
    "Learner",
    "Email",
    "Cohort",
    "Learner status",
    "Activity",
    "Assignment status",
    "Due date",
    "Overdue",
    "Completed at",
    "Best score",
    "Completed attempts",
  ];

  const rows = learners.flatMap((learner) => {
    if (learner.assignments.length === 0) {
      return [[learner.name, learner.email, learner.cohort, learner.status, "", "", "", "", "", "", ""]];
    }
    return learner.assignments.map((assignment) => {
      const scores = assignment.attempts.map((attempt) => attempt.score);
      const overdue = assignment.status !== "COMPLETED" && assignment.dueDate !== null && assignment.dueDate < now;
      return [
        learner.name,
        learner.email,
        learner.cohort,
        learner.status,
        assignment.activity.title,
        assignment.status,
        isoOrEmpty(assignment.dueDate),
        overdue ? "Yes" : "No",
        isoOrEmpty(assignment.completedAt),
        scores.length > 0 ? Math.max(...scores) : "",
        scores.length,
      ];
    });
  });

  return { filename: `pathway-all-results-${dayStamp(now)}.csv`, content: toCsv(headers, rows) };
}
