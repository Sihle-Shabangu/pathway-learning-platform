import bcrypt from "bcryptjs";
import { Prisma } from "@/generated/prisma/client";
import type { CreateLearnerInput, ListLearnersQuery, UpdateLearnerInput } from "@/lib/validation/learner";
import { prisma } from "@/server/db";
import { notFound, validationError } from "@/server/errors";
import { recordAudit } from "@/server/services/audit.service";
import { toAttemptSummary, type AttemptSummary } from "@/server/services/attempt-view";
import { completionRate } from "@/server/services/stats.service";

export type LearnerRow = {
  id: string;
  name: string;
  email: string;
  cohort: string | null;
  status: "ACTIVE" | "INACTIVE";
  lastActiveAt: string | null;
  createdAt: string;
  assignedCount: number;
  completedCount: number;
  averageScore: number | null;
};

export type LearnerList = {
  items: LearnerRow[];
  total: number;
  page: number;
  pageSize: number;
  cohorts: string[];
};

export type LearnerAssignment = {
  id: string;
  activityId: string;
  activityTitle: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  dueDate: string | null;
  assignedAt: string;
  completedAt: string | null;
  bestScore: number | null;
  attempts: AttemptSummary[];
};

export type LearnerDetail = {
  profile: Omit<LearnerRow, "assignedCount" | "completedCount" | "averageScore">;
  summary: {
    assigned: number;
    completed: number;
    inProgress: number;
    completionRate: number | null;
    averageScore: number | null;
  };
  scoreHistory: { attemptId: string; activityTitle: string; completedAt: string; score: number }[];
  assignments: LearnerAssignment[];
};

const DUPLICATE_EMAIL = "A user with this email already exists.";

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function isUniqueEmailError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function assertEmailFree(email: string, exceptUserId?: string): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing && existing.id !== exceptUserId) {
    throw validationError("Please fix the highlighted fields.", { email: DUPLICATE_EMAIL });
  }
}

async function findLearnerOrThrow(id: string) {
  const learner = await prisma.user.findFirst({ where: { id, role: "LEARNER" } });
  if (!learner) throw notFound("Learner");
  return learner;
}

export async function listLearners(query: ListLearnersQuery): Promise<LearnerList> {
  const where: Prisma.UserWhereInput = { role: "LEARNER" };
  if (query.status) where.status = query.status;
  if (query.cohort) where.cohort = query.cohort;
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { email: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const [total, users, cohortRows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        assignments: {
          select: { status: true, attempts: { where: { completedAt: { not: null } }, select: { score: true } } },
        },
      },
    }),
    prisma.user.findMany({
      where: { role: "LEARNER", cohort: { not: null } },
      distinct: ["cohort"],
      select: { cohort: true },
      orderBy: { cohort: "asc" },
    }),
  ]);

  const items: LearnerRow[] = users.map((user) => {
    const scores = user.assignments.flatMap((a) => a.attempts.map((attempt) => attempt.score));
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      cohort: user.cohort,
      status: user.status,
      lastActiveAt: user.lastActiveAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      assignedCount: user.assignments.length,
      completedCount: user.assignments.filter((a) => a.status === "COMPLETED").length,
      averageScore: average(scores),
    };
  });

  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
    cohorts: cohortRows.map((row) => row.cohort).filter((cohort): cohort is string => cohort !== null),
  };
}

export async function createLearner(actorId: string, input: CreateLearnerInput): Promise<{ id: string }> {
  await assertEmailFree(input.email);
  // Hash before opening the transaction: bcrypt is deliberately slow and shouldn't hold a DB transaction open.
  const passwordHash = await bcrypt.hash(input.password, 10);
  try {
    const learner = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          cohort: input.cohort,
          role: "LEARNER",
          status: "ACTIVE",
          passwordHash,
        },
      });
      await recordAudit(
        {
          actorId,
          action: "learner.created",
          entityType: "User",
          entityId: created.id,
          metadata: { name: created.name, cohort: created.cohort },
        },
        tx,
      );
      return created;
    });
    return { id: learner.id };
  } catch (error) {
    // Two admins adding the same email at the same moment: the unique index catches it.
    if (isUniqueEmailError(error)) {
      throw validationError("Please fix the highlighted fields.", { email: DUPLICATE_EMAIL });
    }
    throw error;
  }
}

/** Edits profile fields and/or status. Deactivation is a soft delete (status INACTIVE). */
export async function updateLearner(actorId: string, id: string, input: UpdateLearnerInput): Promise<{ id: string }> {
  const learner = await findLearnerOrThrow(id);
  if (input.email && input.email !== learner.email) {
    await assertEmailFree(input.email, id);
  }

  let action = "learner.updated";
  if (input.status && input.status !== learner.status) {
    action = input.status === "INACTIVE" ? "learner.deactivated" : "learner.reactivated";
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: input });
      await recordAudit(
        {
          actorId,
          action,
          entityType: "User",
          entityId: id,
          metadata: { name: input.name ?? learner.name, changes: Object.keys(input) },
        },
        tx,
      );
    });
  } catch (error) {
    if (isUniqueEmailError(error)) {
      throw validationError("Please fix the highlighted fields.", { email: DUPLICATE_EMAIL });
    }
    throw error;
  }
  return { id };
}

export async function getLearnerDetail(id: string): Promise<LearnerDetail> {
  const learner = await prisma.user.findFirst({
    where: { id, role: "LEARNER" },
    include: {
      assignments: {
        orderBy: { assignedAt: "desc" },
        include: {
          activity: { select: { id: true, title: true } },
          attempts: { orderBy: { startedAt: "desc" } },
        },
      },
    },
  });
  if (!learner) throw notFound("Learner");

  const assignments: LearnerAssignment[] = learner.assignments.map((assignment) => {
    const attempts = assignment.attempts.map(toAttemptSummary);
    const completedScores = attempts.filter((a) => a.status === "COMPLETED").map((a) => a.score);
    return {
      id: assignment.id,
      activityId: assignment.activity.id,
      activityTitle: assignment.activity.title,
      status: assignment.status,
      dueDate: assignment.dueDate?.toISOString() ?? null,
      assignedAt: assignment.assignedAt.toISOString(),
      completedAt: assignment.completedAt?.toISOString() ?? null,
      bestScore: completedScores.length > 0 ? Math.max(...completedScores) : null,
      attempts,
    };
  });

  const scoreHistory = assignments
    .flatMap((assignment) =>
      assignment.attempts
        .filter((attempt) => attempt.completedAt !== null)
        .map((attempt) => ({
          attemptId: attempt.id,
          activityTitle: assignment.activityTitle,
          completedAt: attempt.completedAt as string,
          score: attempt.score,
        })),
    )
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt));

  const completed = assignments.filter((a) => a.status === "COMPLETED").length;
  return {
    profile: {
      id: learner.id,
      name: learner.name,
      email: learner.email,
      cohort: learner.cohort,
      status: learner.status,
      lastActiveAt: learner.lastActiveAt?.toISOString() ?? null,
      createdAt: learner.createdAt.toISOString(),
    },
    summary: {
      assigned: assignments.length,
      completed,
      inProgress: assignments.filter((a) => a.status === "IN_PROGRESS").length,
      completionRate: completionRate(completed, assignments.length),
      averageScore: average(scoreHistory.map((entry) => entry.score)),
    },
    scoreHistory,
    assignments,
  };
}
