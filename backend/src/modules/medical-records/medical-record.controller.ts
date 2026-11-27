
import type { Response } from "express";

import { prisma } from "../../lib/prisma";

import type { AuthenticatedRequest } from "../../middlewares/auth.types";

import { createMedicalRecordSchema } from "./medical-record.validation";

// ==========================================
// 1. CREATE MEDICAL RECORD
// DOCTOR ONLY
// ==========================================

export async function createMedicalRecord(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const input = createMedicalRecordSchema.parse(req.body);

    const doctor = await prisma.doctor.findUnique({
      where: {
        userId: req.user!.id,
      },
      select: {
        id: true,
      },
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor profile not found",
      });
    }

    const patient = await prisma.patient.findUnique({
      where: {
        id: input.patientId,
      },
      select: {
        id: true,
      },
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    if (input.appointmentId) {
      const appointment = await prisma.appointment.findFirst({
        where: {
          id: input.appointmentId,
          patientId: input.patientId,
          doctorId: doctor.id,
          status: {
            in: ["CONFIRMED", "COMPLETED"],
          },
        },
        select: {
          id: true,
        },
      });

      if (!appointment) {
        return res.status(400).json({
          success: false,
          message: "Invalid appointment for this patient and doctor",
        });
      }
    }

    const record = await prisma.medicalRecord.create({
      data: {
        patientId: input.patientId,
        doctorId: doctor.id,
        appointmentId: input.appointmentId,
        recordType: input.recordType,
        title: input.title,
        description: input.description,
        clinicalNotes: input.clinicalNotes,
      },
      include: {
        diagnoses: true,
        prescriptions: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Medical record created successfully",
      data: record,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Invalid medical record information",
        errors: (error as { issues?: unknown[] }).issues,
      });
    }

    console.error("Create medical record error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create medical record",
    });
  }
}

// ==========================================
// 2. GET PATIENT MEDICAL RECORDS
// PATIENT ONLY
// ==========================================

export async function getMyMedicalRecords(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const patient = await prisma.patient.findUnique({
      where: {
        userId: req.user!.id,
      },
      select: {
        id: true,
      },
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found",
      });
    }

    const records = await prisma.medicalRecord.findMany({
      where: {
        patientId: patient.id,
      },
      include: {
        doctor: {
          select: {
            specialization: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        diagnoses: true,
        prescriptions: {
          include: {
            items: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Medical records retrieved successfully",
      data: records,
    });
  } catch (error) {
    console.error("Get patient medical records error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve medical records",
    });
  }
}

// ==========================================
// 3. GET DOCTOR'S CREATED RECORDS
// DOCTOR ONLY
// ==========================================

export async function getMyCreatedRecords(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const doctor = await prisma.doctor.findUnique({
      where: {
        userId: req.user!.id,
      },
      select: {
        id: true,
      },
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor profile not found",
      });
    }

    const records = await prisma.medicalRecord.findMany({
      where: {
        doctorId: doctor.id,
      },
      include: {
        patient: {
          select: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        diagnoses: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Doctor medical records retrieved successfully",
      data: records,
    });
  } catch (error) {
    console.error("Get doctor records error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve doctor records",
    });
  }
}
