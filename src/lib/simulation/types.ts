// Types for the simulation engine. Pure TypeScript: no React, no Prisma.

export type ActionGroup = "investigate" | "safety" | "repair" | "diagnose";

/** What happens when an action is taken under a particular fault. */
export type Outcome = {
  feedback: string;
  scoreDelta: number;
  correct: boolean;
  /** Flags this outcome adds to the state (e.g. "heard_beep_code"), which can unlock other actions. */
  setsFlags?: string[];
  /** True if this action fixes the hidden fault and ends the attempt. */
  resolves?: boolean;
};

export type ScenarioAction = {
  id: string;
  label: string;
  group: ActionGroup;
  /** Flags that must all be set before the action is available. */
  requires?: string[];
  /** Shown next to the lock icon while `requires` is not met. */
  lockHint?: string;
  /** The PC part this action relates to in the illustration (e.g. "ram", "psu"). */
  component?: string;
  /** Outcome per fault id. Faults not listed use `defaultOutcome`. */
  outcomes: Partial<Record<string, Outcome>>;
  defaultOutcome: Outcome;
};

export type Fault = {
  id: string;
  name: string;
  symptoms: string[];
  /** Action ids an expert would take, in order. Only revealed after completion. */
  expertPath: string[];
  /** Plain-language explanation shown on the results screen. */
  explanation: string;
};

export type ScoringRules = {
  startScore: number;
  redundantInvestigationPenalty: number; // e.g. -3
  safetySkippedPenalty: number; // e.g. -15
  efficiencyBonus: number; // e.g. +10
  efficiencyMaxActions: number; // e.g. 6
  minScore: number; // 0
  maxScore: number; // 100
};

export type Scenario = {
  key: string;
  title: string;
  briefing: string;
  /** Flags that must all be set before any repair is safe. */
  safetyFlags: string[];
  /** Flag added when a repair is attempted before the safety flags are set. */
  safetyViolationFlag: string;
  safetyViolationFeedback: string;
  faults: Fault[];
  actions: ScenarioAction[];
  scoring: ScoringRules;
};

/** One logged learner decision. */
export type Decision = {
  step: number;
  actionId: string;
  actionLabel: string;
  group: ActionGroup;
  scoreDelta: number;
  correct: boolean;
  feedback: string;
};

export type SimulationStatus = "IN_PROGRESS" | "COMPLETED";

/** Full engine state. Stored as JSON on SimulationAttempt.state. Contains the hidden fault. */
export type SimulationState = {
  scenarioKey: string;
  seed: number;
  faultId: string;
  /** Number of actions taken so far. The next action is step + 1. */
  step: number;
  score: number;
  flags: string[];
  performedActionIds: string[];
  decisions: Decision[];
  status: SimulationStatus;
};
