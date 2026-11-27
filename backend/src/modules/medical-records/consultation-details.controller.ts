
import type { Response } from "express";
import { prisma } from "../../lib/prisma";
import type { AuthenticatedRequest } from "../../middlewares/auth.types";

export async function getConsultationDetails(
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

    const recordId = Number(req.params.recordId);

    if (!Number.isInteger(recordId) || recordId < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid medical record ID",
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

    const record = await prisma.medicalRecord.findFirst({
      where: {
        id: recordId,
        doctorId: doctor.id,
        recordType: "CONSULTATION",
      },
      select: {
        id: true,
        patientId: true,
        appointmentId: true,
        title: true,
        description: true,
        clinicalNotes: true,
        createdAt: true,

        patient: {
          select: {
            id: true,
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
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Consultation not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Consultation details retrieved successfully",
      consultation: record,
    });
  } catch (error) {
    console.error("GET CONSULTATION DETAILS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve consultation details",
    });
  }
}
