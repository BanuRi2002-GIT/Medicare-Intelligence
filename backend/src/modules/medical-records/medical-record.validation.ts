
import { z } from "zod";

export const createMedicalRecordSchema = z.object({
  patientId: z.number().int().positive(),

  appointmentId: z.number().int().positive().optional(),

  recordType: z.enum([
    "CONSULTATION",
    "DIAGNOSIS",
    "LAB_REPORT",
    "PRESCRIPTION",
    "OTHER",
  ]).default("CONSULTATION"),

  title: z.string().trim().min(2).max(200),

  description: z.string().max(5000).optional(),

  clinicalNotes: z.string().max(10000).optional(),
});

export type CreateMedicalRecordInput =
  z.infer<typeof createMedicalRecordSchema>;
