
import type { Request, Response } from "express";
import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import type { AuthenticatedRequest } from "../../middlewares/auth.types";

// GET ALL DEPARTMENTS
export async function getDepartments(
  _req: Request,
  res: Response
) {
  try {
    const departments = await prisma.department.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        _count: {
          select: {
            doctors: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Departments retrieved successfully",
      data: departments,
    });
  } catch (error) {
    console.error("Get departments error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve departments",
    });
  }
}

// CREATE DEPARTMENT (ADMIN ONLY)
export async function createDepartment(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const { name, description } = req.body;

    if (
      typeof name !== "string" ||
      name.trim().length < 2 ||
      name.trim().length > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Department name must contain 2–100 characters",
      });
    }

    if (
      description !== undefined &&
      description !== null &&
      typeof description !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Description must be a string",
      });
    }

    const department = await prisma.department.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Department created successfully",
      data: department,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        success: false,
        message: "A department with this name already exists",
      });
    }

    console.error("Create department error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create department",
    });
  }
}
