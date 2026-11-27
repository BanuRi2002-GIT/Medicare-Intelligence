import { z } from "zod";

export const createDiagnosisSchema = z.object({
  medicalRecordId: z.number().int().positive(),

  diagnosisName: z
    .string()
    .trim()
    .min(2)
    .max(200),

  description: z
    .string()
    .trim()
    .optional(),
});

export type CreateDiagnosisInput = z.infer<
  typeof createDiagnosisSchema
>;