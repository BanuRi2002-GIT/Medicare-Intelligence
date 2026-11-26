
import type { Request, Response } from "express";
import { Prisma } from "../../../generated/prisma/client";
import { ZodError } from "zod";

import {
  registerSchema,
  loginSchema,
} from "./auth.validation";

import {
  registerPatient,
  loginUser,
} from "./auth.service";

// ==========================================
// PATIENT REGISTRATION
// ==========================================

export async function register(req: Request, res: Response) {
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

    console.error("Registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to register patient",
    });
  }
}

// ==========================================
// USER LOGIN
// ==========================================

export async function login(req: Request, res: Response) {
  try {
    const input = loginSchema.parse(req.body);

    const result = await loginUser(input);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
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

    const message = error instanceof Error ? error.message : "";

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

    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to log in",
    });
  }
}
