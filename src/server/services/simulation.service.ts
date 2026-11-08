import { randomInt } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { apply, availableActions, SimulationError, start } from "@/lib/simulation/engine";
import { getScenario } from "@/lib/simulation/scenarios";
import type { AvailableAction, Decision, Scenario, SimulationState } from "@/lib/simulation/types";
import type { ApplyActionInput } from "@/lib/validation/simulation";
import { prisma } from "@/server/db";
import { conflict, notFound, validationError } from "@/server/errors";
import { recordAudit } from "@/server/services/audit.service";
import { parseState } from "@/server/services/attempt-view";

type Learner = { id: string };

/** Revealed only after the attempt is complete. */
export type SimulationResult = {
  faultId: string;
  faultName: string;
  explanation: string;
  expertPath: { id: string; label: string }[];
  bonus: number;
  finalScore: number;
};

/**
 * Everything the browser gets about an attempt. It never contains the hidden fault
 * (id, name, explanation or expert path) while the attempt is in progress.
 */
export type SimulationView = {
  attemptId: string;
  assignmentId: string;
  activityTitle: string;
  scenarioTitle: string;
  briefing: string;
  status: "IN_PROGRESS" | "COMPLETED";
  step: number;
  score: number;
  symptoms: string[];
  actions: AvailableAction[];
  decisions: Decision[];
  startedAt: string;
  completedAt: string | null;
  result: SimulationResult | null;
};

export type ApplyActionResponse = {
  view: SimulationView;
  feedback: string;
  scoreDelta: number;
  correct: boolean;
};

type AttemptWithActivity = Prisma.SimulationAttemptGetPayload<{
  include: { assignment: { include: { activity: true } } };
}>;

const STALE_STEP_MESSAGE = "That step was already submitted. Showing the latest state.";

function requireScenario(key: string): Scenario {
  const scenario = getScenario(key);
  if (!scenario) throw notFound("Scenario");
  return scenario;
}

/** Builds the browser-safe view. The single place that decides what about the fault is revealed. */
export function toSimulationView(attempt: AttemptWithActivity, scenario: Scenario, state: SimulationState): SimulationView {
  const fault = scenario.faults.find((candidate) => candidate.id === state.faultId);
  if (!fault) throw new Error(`Scenario ${scenario.key} has no fault ${state.faultId}.`);
  const completed = attempt.completedAt !== null;
  const actionLabel = (id: string) => scenario.actions.find((action) => action.id === id)?.label ?? id;

  return {
    attemptId: attempt.id,
    assignmentId: attempt.assignmentId,
    activityTitle: attempt.assignment.activity.title,
    scenarioTitle: scenario.title,
    briefing: scenario.briefing,
    status: completed ? "COMPLETED" : "IN_PROGRESS",
    step: state.step,
    score: state.score,
    symptoms: fault.symptoms, // what the learner observes; does not name the fault
    actions: completed ? [] : availableActions(scenario, state),
    decisions: state.decisions,
    startedAt: attempt.startedAt.toISOString(),
    completedAt: attempt.completedAt?.toISOString() ?? null,
    result: completed
      ? {
          faultId: fault.id,
          faultName: fault.name,
          explanation: fault.explanation,
          expertPath: fault.expertPath.map((id) => ({ id, label: actionLabel(id) })),
          bonus: state.bonus,
          finalScore: state.score,
        }
      : null,
  };
}

function viewOf(attempt: AttemptWithActivity): SimulationView {
  const scenario = requireScenario(attempt.scenarioKey);
  return toSimulationView(attempt, scenario, parseState(attempt.state));
}

/** Loads an attempt the learner owns. Someone else's attempt is reported as not found (no existence leak). */
async function loadOwnedAttempt(learner: Learner, attemptId: string): Promise<AttemptWithActivity> {
  const attempt = await prisma.simulationAttempt.findUnique({
    where: { id: attemptId },
    include: { assignment: { include: { activity: true } } },
  });
  if (!attempt || attempt.assignment.learnerId !== learner.id) throw notFound("Attempt");
  return attempt;
}

/**
 * Resumes the learner's in-progress attempt for this assignment, or starts a new one.
 * For a completed assignment it returns the latest completed attempt (for review).
 */
export async function startOrResume(learner: Learner, assignmentId: string): Promise<SimulationView> {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { activity: true, attempts: { orderBy: { startedAt: "desc" } } },
  });
  if (!assignment || assignment.learnerId !== learner.id) throw notFound("Assignment");
  const scenario = requireScenario(assignment.activity.scenarioKey);

  const include = { assignment: { include: { activity: true } } } as const;
  const inProgress = assignment.attempts.find((attempt) => attempt.completedAt === null);
  if (inProgress) {
    return viewOf(await prisma.simulationAttempt.findUniqueOrThrow({ where: { id: inProgress.id }, include }));
  }
  if (assignment.status === "COMPLETED" && assignment.attempts.length > 0) {
    return viewOf(await prisma.simulationAttempt.findUniqueOrThrow({ where: { id: assignment.attempts[0].id }, include }));
  }

  // The seed is generated here on the server and stored, so the fault can't be chosen by the client.
  const seed = randomInt(0, 2_147_483_647);
  const state = start(scenario, seed);

  const created = await prisma.$transaction(async (tx) => {
    // Claim the assignment atomically so two simultaneous "start" requests can't create two attempts.
    const claimed = await tx.assignment.updateMany({
      where: { id: assignment.id, status: "NOT_STARTED" },
      data: { status: "IN_PROGRESS" },
    });
    if (claimed.count === 0) {
      const existing = await tx.simulationAttempt.findFirst({
        where: { assignmentId: assignment.id, completedAt: null },
        include,
      });
      if (existing) return existing;
    }
    const attempt = await tx.simulationAttempt.create({
      data: {
        assignmentId: assignment.id,
        scenarioKey: scenario.key,
        seed,
        state: state as unknown as Prisma.InputJsonValue,
        score: state.score,
      },
      include,
    });
    await recordAudit(
      {
        actorId: learner.id,
        action: "simulation.started",
        entityType: "SimulationAttempt",
        entityId: attempt.id,
        metadata: { assignmentId: assignment.id },
      },
      tx,
    );
    await tx.user.update({ where: { id: learner.id }, data: { lastActiveAt: new Date() } });
    return attempt;
  });

  return viewOf(created);
}

export async function getAttemptView(learner: Learner, attemptId: string): Promise<SimulationView> {
  return viewOf(await loadOwnedAttempt(learner, attemptId));
}

/**
 * Applies one action on the server (the source of truth) and persists the new state.
 * `expectedStep` must equal the stored step; otherwise it is a duplicate or stale submission (409).
 */
export async function applyAction(learner: Learner, attemptId: string, input: ApplyActionInput): Promise<ApplyActionResponse> {
  const attempt = await loadOwnedAttempt(learner, attemptId);
  if (attempt.completedAt) throw conflict("This attempt is already complete.");

  const scenario = requireScenario(attempt.scenarioKey);
  const state = parseState(attempt.state);
  if (state.step !== input.expectedStep) throw conflict(STALE_STEP_MESSAGE);

  let result;
  try {
    result = apply(scenario, state, input.actionId);
  } catch (error) {
    if (error instanceof SimulationError) {
      if (error.code === "ATTEMPT_COMPLETE") throw conflict(error.message);
      throw validationError(error.message, { actionId: error.message });
    }
    throw error;
  }

  const completed = result.state.status === "COMPLETED";
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    // Conditional update: only succeeds if nobody else saved this step first (atomic duplicate guard).
    const updated = await tx.simulationAttempt.updateMany({
      where: { id: attempt.id, completedAt: null, state: { path: ["step"], equals: input.expectedStep } },
      data: {
        state: result.state as unknown as Prisma.InputJsonValue,
        score: result.state.score,
        completedAt: completed ? now : null,
      },
    });
    if (updated.count === 0) throw conflict(STALE_STEP_MESSAGE);

    await recordAudit(
      {
        actorId: learner.id,
        action: "simulation.action",
        entityType: "SimulationAttempt",
        entityId: attempt.id,
        metadata: { step: result.state.step, actionId: input.actionId, scoreDelta: result.scoreDelta },
      },
      tx,
    );

    if (completed) {
      await tx.assignment.update({
        where: { id: attempt.assignmentId },
        data: { status: "COMPLETED", completedAt: now },
      });
      await recordAudit(
        {
          actorId: learner.id,
          action: "simulation.completed",
          entityType: "SimulationAttempt",
          entityId: attempt.id,
          metadata: { assignmentId: attempt.assignmentId, score: result.state.score },
        },
        tx,
      );
    }

    await tx.user.update({ where: { id: learner.id }, data: { lastActiveAt: now } });
  });

  // We already know exactly what was saved, so build the response without re-reading the row.
  const saved = { ...attempt, completedAt: completed ? now : null, score: result.state.score };
  return {
    view: toSimulationView(saved, scenario, result.state),
    feedback: result.feedback,
    scoreDelta: result.scoreDelta,
    correct: result.correct,
  };
}
