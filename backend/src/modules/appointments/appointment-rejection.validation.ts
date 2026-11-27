import { z } from "zod";

export const rejectAppointmentSchema = z.object({
  reason: z.string()
    .trim()
    .min(5, "Please provide a meaningful rejection reason")
    .max(500, "Rejection reason cannot exceed 500 characters"),
});

export type RejectAppointmentInput = z.infer<
  typeof rejectAppointmentSchema
>;