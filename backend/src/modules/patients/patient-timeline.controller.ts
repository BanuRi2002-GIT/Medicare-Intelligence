
import type { Response } from "express";
import { prisma } from "../../lib/prisma";
import type { AuthenticatedRequest } from "../../middlewares/auth.types";

type TimelineItem = {
  id: number;
  type: "MEDICAL_RECORD" | "MEDICAL_DOCUMENT";
  title: string;
  description: string | null;
  date: Date;
  details: unknown;
};

export async function getMyMedicalTimeline(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const patient = await prisma.patient.findUnique({
      where: { userId: req.user.id },
      select: { id: true },
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found",
      });
    }

    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);

    if (
      !Number.isInteger(page) ||
      !Number.isInteger(limit) ||
      page < 1 ||
      limit < 1 ||
      limit > 50
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination values",
      });
    }

    const [records, documents] = await Promise.all([
      prisma.medicalRecord.findMany({
        where: { patientId: patient.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          recordType: true,
          title: true,
          description: true,
          clinicalNotes: true,
          createdAt: true,
          doctor: {
            select: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          diagnoses: {
            select: {
              id: true,
              diagnosisName: true,
              description: true,
            },
          },
          prescriptions: {
            select: {
              id: true,
              instructions: true,
              createdAt: true,
              items: {
                select: {
                  id: true,
                  medicationName: true,
                  dosage: true,
                  frequency: true,
                  duration: true,
                  instructions: true,
                },
              },
            },
          },
        },
      }),

      prisma.medicalDocument.findMany({
        where: { patientId: patient.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          documentType: true,
          title: true,
          originalName: true,
          mimeType: true,
          fileSize: true,
          createdAt: true,
        },
      }),
    ]);

    const timeline: TimelineItem[] = [
      ...records.map((record) => ({
        id: record.id,
        type: "MEDICAL_RECORD" as const,
        title: record.title,
        description: record.description,
        date: record.createdAt,
        details: {
          recordType: record.recordType,
          clinicalNotes: record.clinicalNotes,
          doctor: record.doctor.user,
          diagnoses: record.diagnoses,
          prescriptions: record.prescriptions,
        },
      })),

      ...documents.map((document) => ({
        id: document.id,
        type: "MEDICAL_DOCUMENT" as const,
        title: document.title,
        description: document.originalName,
        date: document.createdAt,
        details: {
          documentType: document.documentType,
          mimeType: document.mimeType,
          fileSize: document.fileSize,
        },
      })),
    ];

    timeline.sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );

    const total = timeline.length;
    const startIndex = (page - 1) * limit;
    const paginatedTimeline = timeline.slice(
      startIndex,
      startIndex + limit
    );

    return res.status(200).json({
      success: true,
      message: "Medical timeline retrieved successfully",
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      timeline: paginatedTimeline,
    });
  } catch (error) {
    console.error("PATIENT MEDICAL TIMELINE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve medical timeline",
    });
  }
}
