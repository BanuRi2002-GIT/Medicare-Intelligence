
import { z } from "zod";

export const receptionistPatientRegistrationSchema = z.object({
  firstName: z.string().trim().min(2).max(100),
  lastName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(191).transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(72),
  phone: z.string().trim().max(20).optional(),
  dateOfBirth: z.string().date().optional(),
  gender: z.string().trim().max(20).optional(),
  address: z.string().trim().max(1000).optional(),
  emergencyContact: z.string().trim().max(20).optional(),
});

export const patientSearchSchema = z.object({
  search: z.string().trim().min(2).max(100),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
