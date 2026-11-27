
import { z } from "zod";

export const allergySchema = z.object({
  allergen: z.string().trim().min(2).max(191),
  reaction: z.string().trim().max(500).optional(),
  severity: z.enum(["MILD", "MODERATE", "SEVERE"]).optional(),
  notes: z.string().trim().max(5000).optional(),
});

export const conditionSchema = z.object({
  conditionName: z.string().trim().min(2).max(191),
  description: z.string().trim().max(5000).optional(),
  diagnosedAt: z.string().date().optional(),
  status: z.enum(["ACTIVE", "RESOLVED", "UNDER_TREATMENT"]).default("ACTIVE"),
  notes: z.string().trim().max(5000).optional(),
});
