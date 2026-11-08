import { z } from "zod";

export const startSimulationSchema = z.object({
  assignmentId: z.string().min(1, "assignmentId is required."),
});

export const applyActionSchema = z.object({
  actionId: z.string().min(1, "actionId is required."),
  /** The step the client believes it is on. A mismatch means a duplicate or stale submission (409). */
  expectedStep: z.number().int().min(0),
});
export type ApplyActionInput = z.infer<typeof applyActionSchema>;
