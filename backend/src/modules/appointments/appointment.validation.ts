
import { z } from "zod";

// ==========================================
// CREATE APPOINTMENT VALIDATION
// ==========================================

export const createAppointmentSchema = z.object({
  doctorId: z.number().int().positive(),

  startAt: z.string().datetime({
    offset: true,
    message: "A valid appointment start time is required",
  }),

  endAt: z.string().datetime({
    offset: true,
    message: "A valid appointment end time is required",
  }),

  reason: z.string().max(1000).optional(),
}).refine(
  (data) =>
    new Date(data.endAt).getTime() >
    new Date(data.startAt).getTime(),
  {
    message: "Appointment end time must be after start time",
    path: ["endAt"],
  }
);

// ==========================================
// RESCHEDULE APPOINTMENT VALIDATION
// ==========================================

export const rescheduleAppointmentSchema = z.object({
  startAt: z.string().datetime({
    offset: true,
    message: "A valid appointment start time is required",
  }),

  endAt: z.string().datetime({
    offset: true,
    message: "A valid appointment end time is required",
  }),
}).refine(
  (data) =>
    new Date(data.endAt).getTime() >
    new Date(data.startAt).getTime(),
  {
    message: "Appointment end time must be after start time",
    path: ["endAt"],
  }
);

// ==========================================
// TYPESCRIPT INPUT TYPES
// ==========================================

export type CreateAppointmentInput =
  z.infer<typeof createAppointmentSchema>;

export type RescheduleAppointmentInput =
  z.infer<typeof rescheduleAppointmentSchema>;
