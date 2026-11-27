
import type { Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import type { AuthenticatedRequest } from "../../middlewares/auth.types";
import {
  allergySchema,
  conditionSchema,
} from "./patient-health.validation";

async function getAuthenticatedPatientId(userId: number) {
  const patient = await prisma.patient.findUnique({
    where: { userId },
    select: { id: true },
  });

  return patient?.id ?? null;
}

export async function getMyHealthHistory(
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

    const patientId = await getAuthenticatedPatientId(req.user.id);

    if (!patientId) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found",
      });
    }

    const [allergies, conditions] = await Promise.all([
      prisma.patientAllergy.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.patientCondition.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return res.status(200).json({
      success: true,
      allergies,
      conditions,
    });
  } catch (error) {
    console.error("GET PATIENT HEALTH HISTORY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve health history",
    });
  }
}

export async function addMyAllergy(
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

    const validation = allergySchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid allergy details",
        errors: z.treeifyError(validation.error),
      });
    }

    const patientId = await getAuthenticatedPatientId(req.user.id);

    if (!patientId) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found",
      });
    }

    const allergy = await prisma.patientAllergy.create({
      data: {
        patientId,
        ...validation.data,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Allergy added successfully",
      allergy,
    });
  } catch (error) {
    console.error("ADD PATIENT ALLERGY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to add allergy",
    });
  }
}

export async function deleteMyAllergy(
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

    const allergyId = Number(req.params.id);

    if (!Number.isInteger(allergyId) || allergyId < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid allergy ID",
      });
    }

    const patientId = await getAuthenticatedPatientId(req.user.id);

    if (!patientId) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found",
      });
    }

    const result = await prisma.patientAllergy.deleteMany({
      where: {
        id: allergyId,
        patientId,
      },
    });

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        message: "Allergy not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Allergy deleted successfully",
    });
  } catch (error) {
    console.error("DELETE PATIENT ALLERGY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete allergy",
    });
  }
}

export async function addMyCondition(
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

    const validation = conditionSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid condition details",
        errors: z.treeifyError(validation.error),
      });
    }

    const patientId = await getAuthenticatedPatientId(req.user.id);

    if (!patientId) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found",
      });
    }

    const condition = await prisma.patientCondition.create({
      data: {
        patientId,
        conditionName: validation.data.conditionName,
        description: validation.data.description,
        diagnosedAt: validation.data.diagnosedAt
          ? new Date(`${validation.data.diagnosedAt}T00:00:00.000Z`)
          : undefined,
        status: validation.data.status,
        notes: validation.data.notes,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Condition added successfully",
      condition,
    });
  } catch (error) {
    console.error("ADD PATIENT CONDITION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to add condition",
    });
  }
}

export async function deleteMyCondition(
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

    const conditionId = Number(req.params.id);

    if (!Number.isInteger(conditionId) || conditionId < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid condition ID",
      });
    }

    const patientId = await getAuthenticatedPatientId(req.user.id);

    if (!patientId) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found",
      });
    }

    const result = await prisma.patientCondition.deleteMany({
      where: {
        id: conditionId,
        patientId,
      },
    });

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        message: "Condition not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Condition deleted successfully",
    });
  } catch (error) {
    console.error("DELETE PATIENT CONDITION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete condition",
    });
  }
}
