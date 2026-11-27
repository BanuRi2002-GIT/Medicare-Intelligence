
import type { Response } from "express";
import { prisma } from "../../lib/prisma";
import type { AuthenticatedRequest } from "../../middlewares/auth.types";

// GET LOGGED-IN PATIENT PROFILE
export async function getMyPatientProfile(
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
        dateOfBirth: true,
        gender: true,
        address: true,
        emergencyContact: true,
        createdAt: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Patient profile retrieved successfully",
      data: patient,
    });
  } catch (error) {
    console.error("Get patient profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve patient profile",
    });
  }
}

// UPDATE LOGGED-IN PATIENT PROFILE
export async function updateMyPatientProfile(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const { dateOfBirth, gender, address, emergencyContact } = req.body;

    if (
      dateOfBirth !== undefined &&
      (typeof dateOfBirth !== "string" ||
        Number.isNaN(Date.parse(dateOfBirth)))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid date of birth",
      });
    }

    if (gender !== undefined && typeof gender !== "string") {
      return res.status(400).json({
        success: false,
        message: "Gender must be a string",
      });
    }

    if (address !== undefined && typeof address !== "string") {
      return res.status(400).json({
        success: false,
        message: "Address must be a string",
      });
    }

    if (
      emergencyContact !== undefined &&
      typeof emergencyContact !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Emergency contact must be a string",
      });
    }

    const patient = await prisma.patient.update({
      where: {
        userId: req.user!.id,
      },
      data: {
        ...(dateOfBirth !== undefined && {
          dateOfBirth: new Date(dateOfBirth),
        }),
        ...(gender !== undefined && { gender }),
        ...(address !== undefined && { address }),
        ...(emergencyContact !== undefined && { emergencyContact }),
      },
      select: {
        id: true,
        dateOfBirth: true,
        gender: true,
        address: true,
        emergencyContact: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Patient profile updated successfully",
      data: patient,
    });
  } catch (error) {
    console.error("Update patient profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update patient profile",
    });
  }
}

// GET PATIENT MEDICAL HISTORY
export async function getMyMedicalHistory(
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

    const [records, allergies, conditions] = await Promise.all([
      prisma.medicalRecord.findMany({
        where: {
          patientId: patient.id,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.patientAllergy.findMany({
        where: {
          patientId: patient.id,
        },
      }),
      prisma.patientCondition.findMany({
        where: {
          patientId: patient.id,
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Medical history retrieved successfully",
      data: {
        records,
        allergies,
        conditions,
      },
    });
  } catch (error) {
    console.error("Get medical history error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve medical history",
    });
  }
}
