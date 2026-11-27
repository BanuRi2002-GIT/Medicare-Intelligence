
import { z } from "zod";

export const receptionistRescheduleSchema = z.object({
  startAt: z.string().datetime({ offset: true }),
  endAt: z.string().datetime({ offset: true }),
}).refine(
  (data) => new Date(data.endAt) > new Date(data.startAt),
  {
    message: "End time must be after start time",
    path: ["endAt"],
  },
);

export type ReceptionistRescheduleInput = z.infer<
  typeof receptionistRescheduleSchema
>;
