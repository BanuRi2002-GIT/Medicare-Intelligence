
import type { Response } from "express";
import { prisma } from "../../lib/prisma";
import type { AuthenticatedRequest } from "../../middlewares/auth.types";

export async function getPatientConsultationHistory(
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

    const patientId = Number(req.params.patientId);
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);

    if (!Number.isInteger(patientId) || patientId < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid patient ID",
      });
    }

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

    const doctor = await prisma.doctor.findUnique({
      where: { userId: req.user.id },
      select: { id: true },
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor profile not found",
      });
    }

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    const where = {
      patientId,
      doctorId: doctor.id,
      recordType: "CONSULTATION" as const,
    };

    const [records, total] = await Promise.all([
      prisma.medicalRecord.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          appointmentId: true,
          title: true,
          description: true,
          clinicalNotes: true,
          createdAt: true,
        },
      }),

      prisma.medicalRecord.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Consultation history retrieved successfully",
      patient: {
        id: patient.id,
        firstName: patient.user.firstName,
        lastName: patient.user.lastName,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      consultations: records,
    });
  } catch (error) {
    console.error("CONSULTATION HISTORY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve consultation history",
    });
  }
}
