
import type { Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import type { AuthenticatedRequest } from "../../middlewares/auth.types";
import {
  receptionistPatientRegistrationSchema,
  patientSearchSchema,
} from "./receptionist.validation";

export async function registerPatientByReceptionist(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const validation = receptionistPatientRegistrationSchema.safeParse(
      req.body
    );

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid patient registration details",
        errors: z.treeifyError(validation.error),
      });
    }

    const input = validation.data;

    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const patientRole = await prisma.role.findUnique({
      where: { name: "PATIENT" },
      select: { id: true },
    });

    if (!patientRole) {
      return res.status(500).json({
        success: false,
        message: "Patient role is not configured",
      });
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const patient = await prisma.$transaction(async (tx) => {
      return tx.user.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          passwordHash,
          phone: input.phone,
          userRoles: {
            create: {
              roleId: patientRole.id,
            },
          },
          patient: {
            create: {
              dateOfBirth: input.dateOfBirth
                ? new Date(`${input.dateOfBirth}T00:00:00.000Z`)
                : undefined,
              gender: input.gender,
              address: input.address,
              emergencyContact: input.emergencyContact,
            },
          },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          patient: {
            select: {
              id: true,
              dateOfBirth: true,
              gender: true,
            },
          },
        },
      });
    });

    return res.status(201).json({
      success: true,
      message: "Patient registered successfully",
      patient,
    });
  } catch (error) {
    console.error("RECEPTIONIST PATIENT REGISTRATION ERROR:", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to register patient",
    });
  }
}

export async function searchPatientsByReceptionist(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const validation = patientSearchSchema.safeParse(req.query);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid search parameters",
        errors: z.treeifyError(validation.error),
      });
    }

    const { search, page, limit } = validation.data;

    const where = {
      user: {
        OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
        ],
      },
    };

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        orderBy: {
          user: {
            firstName: "asc",
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          dateOfBirth: true,
          gender: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              status: true,
            },
          },
        },
      }),

      prisma.patient.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Patient search completed",
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      patients,
    });
  } catch (error) {
    console.error("RECEPTIONIST PATIENT SEARCH ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to search patients",
    });
  }
}
