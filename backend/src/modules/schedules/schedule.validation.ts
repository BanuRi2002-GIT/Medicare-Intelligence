import { z } from "zod";

export const createScheduleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(
    /^([01]\d|2[0-3]):[0-5]\d$/,
    "Start time must use HH:mm format"
  ),
  endTime: z.string().regex(
    /^([01]\d|2[0-3]):[0-5]\d$/,
    "End time must use HH:mm format"
  ),
}).refine(
  (data) => data.startTime < data.endTime,
  {
    message: "End time must be later than start time",
    path: ["endTime"],
  }
);

export const updateScheduleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  isAvailable: z.boolean().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "Provide at least one field to update" }
);

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;