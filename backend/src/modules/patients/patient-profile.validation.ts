
import { z } from "zod";

export const updatePatientProfileSchema = z
  .object({
    firstName: z.string().trim().min(2).max(100).optional(),
    lastName: z.string().trim().min(2).max(100).optional(),

    phone: z.string().trim().max(20).nullable().optional(),

    dateOfBirth: z
      .union([
        z.string().date(),
        z.null(),
      ])
      .optional(),

    gender: z.string().trim().max(20).nullable().optional(),
    address: z.string().trim().max(1000).nullable().optional(),
    emergencyContact: z.string().trim().max(20).nullable().optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: "Provide at least one field to update" }
  );

export type UpdatePatientProfileInput = z.infer<
  typeof updatePatientProfileSchema
>;
