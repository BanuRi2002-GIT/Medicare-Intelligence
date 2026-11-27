
import { z } from "zod";

export const receptionistBookingSchema = z.object({
  patientId: z.number().int().positive(),
  doctorId: z.number().int().positive(),
  startAt: z.string().datetime({ offset: true }),
  endAt: z.string().datetime({ offset: true }),
  reason: z.string().trim().max(2000).optional(),
}).refine(
  (data) => new Date(data.endAt) > new Date(data.startAt),
  {
    message: "Appointment end time must be after start time",
    path: ["endAt"],
  }
);
