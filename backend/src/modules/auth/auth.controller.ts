
import type { Response } from "express";
import { Prisma } from "../../../generated/prisma/client";
import { ZodError } from "zod";

import { prisma } from "../../lib/prisma";
import type { AuthenticatedRequest } from "../../middlewares/auth.types";

import {
  registerSchema,
  loginSchema,
} from "./auth.validation";

import {
  registerPatient,
  loginUser,
} from "./auth.service";

// ==========================================
// 1. PATIENT REGISTRATION
// ==========================================

export async function register(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const input = registerSchema.parse(req.body);

    const user = await registerPatient(input);

    return res.status(201).json({
      success: true,
      message: "Patient registered successfully",
      data: user,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    console.error("REGISTRATION ERROR DETAILS:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to register patient",
    });
  }
}

// ==========================================
// 2. USER LOGIN
// ==========================================

export async function login(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const input = loginSchema.parse(req.body);

    const result = await loginUser(input);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    // Print the original error in the backend terminal.
    console.error("LOGIN ERROR DETAILS:", error);

    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const message =
      error instanceof Error ? error.message : "";

    if (message === "Invalid email or password") {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (message === "Your account is not active") {
      return res.status(403).json({
        success: false,
        message: "Your account is not active",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to log in",
    });
  }
}

// ==========================================
// 3. GET AUTHENTICATED USER PROFILE
// ==========================================

export async function getMe(
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

    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        status: true,
        createdAt: true,

        userRoles: {
          select: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },

        patient: {
          select: {
            id: true,
          },
        },

        doctor: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found",
      });
    }

    const { userRoles, ...userDetails } = user;

    return res.status(200).json({
      success: true,
      message: "User profile retrieved successfully",
      data: {
        ...userDetails,
        roles: userRoles.map((item) => item.role.name),
      },
    });
  } catch (error) {
    console.error("GET PROFILE ERROR DETAILS:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve user profile",
    });
  }
}
