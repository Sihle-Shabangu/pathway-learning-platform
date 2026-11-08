/**
 * The simulation engine. Pure TypeScript:
 * - no React, no Prisma, no Date.now(), no Math.random() (the seed is passed in),
 * - never mutates its inputs; every function returns new objects,
 * - knows nothing about specific faults: all fault-specific behaviour is scenario data.
 */
import type {
  ApplyResult,
  AvailableAction,
  Decision,
  Outcome,
  Scenario,
  ScenarioAction,
  SimulationState,
} from "./types";

export type SimulationErrorCode = "UNKNOWN_ACTION" | "ACTION_LOCKED" | "ATTEMPT_COMPLETE";

export class SimulationError extends Error {
  readonly code: SimulationErrorCode;

  constructor(code: SimulationErrorCode, message: string) {
    super(message);
    this.name = "SimulationError";
    this.code = code;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hasAllFlags(flags: string[], required: string[] | undefined): boolean {
  return (required ?? []).every((flag) => flags.includes(flag));
}

/** Adds flags without duplicates, returning a new array. */
function withFlags(flags: string[], added: string[] | undefined): string[] {
  const next = [...flags];
  for (const flag of added ?? []) {
    if (!next.includes(flag)) next.push(flag);
  }
  return next;
}

/** Begins an attempt. The fault is chosen from the seed: faults[seed % faults.length]. */
export function start(scenario: Scenario, seed: number): SimulationState {
  const index = Math.abs(Math.trunc(seed)) % scenario.faults.length;
  return {
    scenarioKey: scenario.key,
    seed,
    faultId: scenario.faults[index].id,
    step: 0,
    score: scenario.scoring.startScore,
    flags: [],
    performedActionIds: [],
    decisions: [],
    status: "IN_PROGRESS",
    bonus: 0,
  };
}

/** Every action in the scenario, marked locked/unlocked for the current state. */
export function availableActions(scenario: Scenario, state: SimulationState): AvailableAction[] {
  return scenario.actions.map((action) => {
    const locked = !hasAllFlags(state.flags, action.requires);
    return {
      id: action.id,
      label: action.label,
      group: action.group,
      component: action.component,
      locked,
      lockHint: locked ? action.lockHint : undefined,
    };
  });
}

export function isComplete(state: SimulationState): boolean {
  return state.status === "COMPLETED";
}

export function finalScore(state: SimulationState): number {
  return state.score;
}

/** The outcome for this action under the hidden fault, before scoring rules are applied. */
function outcomeFor(action: ScenarioAction, faultId: string): Outcome {
  return action.outcomes[faultId] ?? action.defaultOutcome;
}

/**
 * Takes one action and returns the next state plus the feedback to show.
 * Throws SimulationError for an unknown action, a locked action, or a finished attempt.
 *
 * Rules, applied in this order:
 * 1. A repeated investigation gives no new information: redundant-investigation penalty only.
 * 2. Otherwise the fault-specific outcome applies (feedback, score change, flags, resolves).
 * 3. A correct repair made without its supporting evidence costs the evidence penalty.
 * 4. A repair made before all safety flags are set costs the safety penalty and sets the violation flag.
 * 5. If the fault is resolved, the attempt completes; finishing within the action limit earns the bonus.
 */
export function apply(scenario: Scenario, state: SimulationState, actionId: string): ApplyResult {
  if (state.status === "COMPLETED") {
    throw new SimulationError("ATTEMPT_COMPLETE", "This attempt is already complete.");
  }
  const action = scenario.actions.find((candidate) => candidate.id === actionId);
  if (!action) {
    throw new SimulationError("UNKNOWN_ACTION", `Unknown action "${actionId}".`);
  }
  if (!hasAllFlags(state.flags, action.requires)) {
    throw new SimulationError("ACTION_LOCKED", action.lockHint ?? "That action isn't available yet.");
  }

  const { scoring } = scenario;
  const outcome = outcomeFor(action, state.faultId);
  const isRepeat = state.performedActionIds.includes(action.id);

  let scoreDelta: number;
  let correct: boolean;
  let feedbackParts: string[];
  let flags = state.flags;
  let resolves = false;

  if (action.group === "investigate" && isRepeat) {
    // Rule 1
    scoreDelta = scoring.redundantInvestigationPenalty;
    correct = false;
    feedbackParts = [scenario.redundantInvestigationFeedback];
  } else {
    // Rule 2
    scoreDelta = outcome.scoreDelta;
    correct = outcome.correct;
    feedbackParts = [outcome.feedback];
    flags = withFlags(flags, outcome.setsFlags);
    resolves = outcome.resolves === true;

    // Rule 3
    if (outcome.evidence && !outcome.evidence.flags.some((flag) => state.flags.includes(flag))) {
      scoreDelta += outcome.evidence.penalty;
      correct = false;
      feedbackParts = [outcome.evidence.feedback, ...feedbackParts];
    }

    // Rule 4
    if (action.group === "repair" && !hasAllFlags(state.flags, scenario.safetyFlags)) {
      scoreDelta += scoring.safetySkippedPenalty;
      correct = false;
      flags = withFlags(flags, [scenario.safetyViolationFlag]);
      feedbackParts = [scenario.safetyViolationFeedback, ...feedbackParts];
    }
  }

  const step = state.step + 1;
  let score = clamp(state.score + scoreDelta, scoring.minScore, scoring.maxScore);

  // Rule 5
  let bonus = 0;
  if (resolves && step <= scoring.efficiencyMaxActions) {
    bonus = scoring.efficiencyBonus;
    score = clamp(score + bonus, scoring.minScore, scoring.maxScore);
  }

  const feedback = feedbackParts.join(" ");
  const decision: Decision = {
    step,
    actionId: action.id,
    actionLabel: action.label,
    group: action.group,
    scoreDelta,
    correct,
    feedback,
  };

  const nextState: SimulationState = {
    ...state,
    step,
    score,
    flags,
    performedActionIds: [...state.performedActionIds, action.id],
    decisions: [...state.decisions, decision],
    status: resolves ? "COMPLETED" : "IN_PROGRESS",
    bonus,
  };

  return { state: nextState, feedback, scoreDelta, correct };
}
