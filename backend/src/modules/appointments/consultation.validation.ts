
import { z } from "zod";

export const consultationSchema = z.object({
  title: z.string().trim().min(3).max(191),
  description: z.string().trim().max(5000).optional(),
  clinicalNotes: z.string().trim().min(1).max(20000),
});

export type ConsultationInput = z.infer<typeof consultationSchema>;
