
import { z } from "zod";

// ==========================================
// PATIENT REGISTRATION VALIDATION
// ==========================================

export const registerSchema = z.object({
  firstName: z
    .string()
    .min(2, "First name must contain at least 2 characters")
    .max(100),

  lastName: z
    .string()
    .min(2, "Last name must contain at least 2 characters")
    .max(100),

  email: z
    .string()
    .email("Please provide a valid email address")
    .max(191)
    .transform((value) => value.trim().toLowerCase()),

  password: z
    .string()
    .min(8, "Password must contain at least 8 characters")
    .max(72, "Password is too long"),

  phone: z.string().max(20).optional(),

  dateOfBirth: z.string().optional(),

  gender: z.string().max(20).optional(),

  address: z.string().optional(),

  emergencyContact: z.string().max(20).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

// ==========================================
// USER LOGIN VALIDATION
// ==========================================

export const loginSchema = z.object({
  email: z
    .string()
    .email("Please provide a valid email address")
    .max(191)
    .transform((value) => value.trim().toLowerCase()),

  password: z
    .string()
    .min(1, "Password is required")
    .max(72, "Password is too long"),
});

export type LoginInput = z.infer<typeof loginSchema>;
