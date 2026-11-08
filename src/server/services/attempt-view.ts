import type { Decision, SimulationState } from "@/lib/simulation/types";

/** The parts of a SimulationAttempt row this module reads. */
type AttemptRow = {
  id: string;
  score: number;
  state: unknown;
  startedAt: Date;
  completedAt: Date | null;
};

/** A browser-safe view of an attempt. `faultId` is null until the attempt is complete. */
export type AttemptSummary = {
  id: string;
  score: number;
  status: "IN_PROGRESS" | "COMPLETED";
  step: number;
  startedAt: string;
  completedAt: string | null;
  decisions: Decision[];
  faultId: string | null;
};

/** Reads the JSON state column. Throws if it doesn't look like engine state. */
export function parseState(raw: unknown): SimulationState {
  const state = raw as SimulationState;
  if (!state || typeof state !== "object" || !Array.isArray(state.decisions) || typeof state.faultId !== "string") {
    throw new Error("Stored simulation state is malformed.");
  }
  return state;
}

/** Builds the summary. This is the only place that decides whether the hidden fault may be shown. */
export function toAttemptSummary(attempt: AttemptRow): AttemptSummary {
  const state = parseState(attempt.state);
  const completed = attempt.completedAt !== null;
  return {
    id: attempt.id,
    score: attempt.score,
    status: completed ? "COMPLETED" : "IN_PROGRESS",
    step: state.step,
    startedAt: attempt.startedAt.toISOString(),
    completedAt: attempt.completedAt ? attempt.completedAt.toISOString() : null,
    decisions: state.decisions,
    faultId: completed ? state.faultId : null,
  };
}
