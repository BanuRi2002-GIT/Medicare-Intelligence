import type { Response } from "express";
import { prisma } from "../../lib/prisma";
import type { AuthenticatedRequest } from "../../middlewares/auth.types";
import { createDiagnosisSchema } from "./diagnosis.validation";

export async function createDiagnosis(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const validation = createDiagnosisSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid diagnosis information",
        errors: validation.error.flatten(),
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const doctor = await prisma.doctor.findUnique({
      where: { userId: req.user.id },
      select: { id: true },
    });

    if (!doctor) {
      return res.status(403).json({
        success: false,
        message: "Doctor profile not found",
      });
    }

    const { medicalRecordId, diagnosisName, description } =
      validation.data;

    const medicalRecord = await prisma.medicalRecord.findFirst({
      where: {
        id: medicalRecordId,
        doctorId: doctor.id,
      },
      select: { id: true },
    });

    if (!medicalRecord) {
      return res.status(404).json({
        success: false,
        message: "Medical record not found or access denied",
      });
    }

    const diagnosis = await prisma.diagnosis.create({
      data: {
        medicalRecordId,
        diagnosisName,
        description,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Diagnosis created successfully",
      data: diagnosis,
    });
  } catch (error) {
    console.error("CREATE DIAGNOSIS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create diagnosis",
    });
  }
}

export async function getDiagnosesByRecord(
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

    if (!Number.isInteger(recordId) || recordId <= 0) {
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
      return res.status(403).json({
        success: false,
        message: "Doctor profile not found",
      });
    }

    const record = await prisma.medicalRecord.findFirst({
      where: {
        id: recordId,
        doctorId: doctor.id,
      },
      select: { id: true },
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Medical record not found or access denied",
      });
    }

    const diagnoses = await prisma.diagnosis.findMany({
      where: { medicalRecordId: recordId },
      orderBy: { diagnosedAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      data: diagnoses,
    });
  } catch (error) {
    console.error("GET DIAGNOSES ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve diagnoses",
    });
  }
}