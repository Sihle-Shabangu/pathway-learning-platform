import { z } from "zod";

export const auditQuerySchema = z
  .object({
    action: z.string().trim().max(60).optional(),
    /** Matches the actor's name or email. */
    actor: z.string().trim().max(100).optional(),
    /** "YYYY-MM-DD", inclusive. */
    from: z.iso.date({ message: "Use a valid start date." }).optional(),
    to: z.iso.date({ message: "Use a valid end date." }).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: "The start date must be on or before the end date.",
    path: ["from"],
  });
export type AuditQuery = z.infer<typeof auditQuerySchema>;
