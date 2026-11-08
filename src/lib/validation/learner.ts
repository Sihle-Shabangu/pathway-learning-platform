import { z } from "zod";

const name = z.string().trim().min(2, "Enter the learner's full name.").max(100, "Keep the name under 100 characters.");
const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address."));
const cohort = z.string().trim().max(50, "Keep the cohort under 50 characters.");

export const createLearnerSchema = z.object({
  name,
  email,
  cohort: cohort.min(1, "Choose or enter a cohort."),
  password: z.string().min(8, "Use at least 8 characters.").max(100),
});
export type CreateLearnerInput = z.infer<typeof createLearnerSchema>;

/** Every field is optional: send only what changed. */
export const updateLearnerSchema = z
  .object({
    name: name.optional(),
    email: email.optional(),
    cohort: cohort.min(1, "Choose or enter a cohort.").optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Nothing to update." });
export type UpdateLearnerInput = z.infer<typeof updateLearnerSchema>;

export const listLearnersQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  cohort: z.string().trim().max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});
export type ListLearnersQuery = z.infer<typeof listLearnersQuerySchema>;
