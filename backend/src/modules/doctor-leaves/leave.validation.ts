import { z } from "zod";

export const createLeaveSchema = z.object({
  leaveDate: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "Leave date must use YYYY-MM-DD format"
  ),
  reason: z.string().max(255).optional(),
});

export type CreateLeaveInput = z.infer<typeof createLeaveSchema>;