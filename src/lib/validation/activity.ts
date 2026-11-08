import { z } from "zod";
import { SCENARIO_OPTIONS } from "@/lib/simulation/scenarios/catalog";

const scenarioKeys = SCENARIO_OPTIONS.map((option) => option.key) as [string, ...string[]];

export const createActivitySchema = z.object({
  title: z.string().trim().min(3, "Enter a title of at least 3 characters.").max(120),
  description: z.string().trim().min(10, "Describe the activity in at least 10 characters.").max(1000),
  scenarioKey: z.enum(scenarioKeys, { message: "Choose a simulation scenario." }),
  estimatedMinutes: z.coerce
    .number({ message: "Enter a number of minutes." })
    .int("Use whole minutes.")
    .min(1, "At least 1 minute.")
    .max(600, "At most 600 minutes."),
});
export type CreateActivityInput = z.infer<typeof createActivitySchema>;

/** "YYYY-MM-DD" from an <input type="date">, or empty for no due date. */
const dueDate = z
  .union([z.iso.date({ message: "Enter a valid date." }), z.literal("")])
  .optional()
  .transform((value) => (value ? value : undefined));

export const assignActivitySchema = z
  .object({
    activityId: z.string().min(1),
    learnerIds: z.array(z.string().min(1)).max(500).default([]),
    cohort: z.string().trim().max(50).optional(),
    dueDate,
  })
  .refine((value) => value.learnerIds.length > 0 || Boolean(value.cohort), {
    message: "Choose at least one learner or a cohort.",
    path: ["learnerIds"],
  });
export type AssignActivityInput = z.input<typeof assignActivitySchema>;
