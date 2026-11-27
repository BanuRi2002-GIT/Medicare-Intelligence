import type { Response } from "express";
import { prisma } from "../../lib/prisma";
import type { AuthenticatedRequest } from "../../middlewares/auth.types";
import { createPrescriptionSchema } from "./prescription.validation";

export async function createPrescription(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const validation = createPrescriptionSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid prescription information",
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

    const { medicalRecordId, instructions, items } = validation.data;

    const medicalRecord = await prisma.medicalRecord.findFirst({
      where: {
        id: medicalRecordId,
        doctorId: doctor.id,
      },
      select: {
        id: true,
        patientId: true,
      },
    });

    if (!medicalRecord) {
      return res.status(404).json({
        success: false,
        message: "Medical record not found or access denied",
      });
    }

    const prescription = await prisma.prescription.create({
      data: {
        medicalRecordId: medicalRecord.id,
        doctorId: doctor.id,
        patientId: medicalRecord.patientId,
        instructions,
        items: {
          create: items,
        },
      },
      include: {
        items: true,
        medicalRecord: {
          select: {
            id: true,
            title: true,
            recordType: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Prescription created successfully",
      data: prescription,
    });
  } catch (error) {
    console.error("CREATE PRESCRIPTION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create prescription",
    });
  }
}

export async function getMyPrescriptions(
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

    const prescriptions = await prisma.prescription.findMany({
      where: {
        doctorId: doctor.id,
      },
      include: {
        items: true,
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
        medicalRecord: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        issuedAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      data: prescriptions,
    });
  } catch (error) {
    console.error("GET PRESCRIPTIONS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve prescriptions",
    });
  }
}