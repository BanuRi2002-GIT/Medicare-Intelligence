import { z } from "zod";

export const uploadDocumentSchema = z.object({
  documentType: z.enum([
    "LAB_REPORT",
    "SCAN_REPORT",
    "PRESCRIPTION",
    "REFERRAL_LETTER",
    "DISCHARGE_SUMMARY",
    "OTHER",
  ]),

  title: z.string().trim().min(2).max(200),
});

export type UploadDocumentInput = z.infer<
  typeof uploadDocumentSchema
>;