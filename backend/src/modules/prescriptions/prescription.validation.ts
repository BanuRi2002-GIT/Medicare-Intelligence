import { z } from "zod";

const prescriptionItemSchema = z.object({
  medicationName: z.string().trim().min(2).max(200),

  dosage: z.string().trim().min(1).max(100),

  frequency: z.string().trim().min(1).max(100),

  duration: z.string().trim().min(1).max(100),

  instructions: z.string().trim().optional(),
});

export const createPrescriptionSchema = z.object({
  medicalRecordId: z.number().int().positive(),

  instructions: z.string().trim().optional(),

  items: z.array(prescriptionItemSchema).min(1).max(20),
});

export type CreatePrescriptionInput = z.infer<
  typeof createPrescriptionSchema
>;