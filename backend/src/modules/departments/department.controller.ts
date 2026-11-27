
import type { Request, Response } from "express";
import { Prisma } from "../../../generated/prisma/client";

import { prisma } from "../../lib/prisma";
import type { AuthenticatedRequest } from "../../middlewares/auth.types";

// ==========================================
// 1. GET ALL DEPARTMENTS
// ==========================================

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
    console.error("GET DEPARTMENTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve departments",
    });
  }
}

// ==========================================
// 2. GET DEPARTMENT BY ID
// ==========================================

export async function getDepartmentById(
  req: Request,
  res: Response
) {
  try {
    const departmentId = Number(req.params.id);

    if (!Number.isInteger(departmentId) || departmentId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid department ID",
      });
    }

    const department = await prisma.department.findUnique({
      where: {
        id: departmentId,
      },
      include: {
        _count: {
          select: {
            doctors: true,
          },
        },
        doctors: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Department retrieved successfully",
      data: {
        id: department.id,
        name: department.name,
        description: department.description,
        doctorCount: department._count.doctors,

        doctors: department.doctors.map((doctor) => ({
          id: doctor.id,
          name: `${doctor.user.firstName} ${doctor.user.lastName}`,
          email: doctor.user.email,
          specialization: doctor.specialization,
          experienceYears: doctor.experienceYears,
        })),
      },
    });
  } catch (error) {
    console.error("GET DEPARTMENT BY ID ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve department",
    });
  }
}

// ==========================================
// 3. CREATE DEPARTMENT (ADMIN ONLY)
// ==========================================

export async function createDepartment(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const { name, description } = req.body;

    // Validate department name
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

    // Validate description
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
        description:
          typeof description === "string"
            ? description.trim() || null
            : null,
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

    console.error("CREATE DEPARTMENT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create department",
    });
  }
}

// ==========================================
// 4. UPDATE DEPARTMENT
// ==========================================

export async function updateDepartment(
  req: Request,
  res: Response
) {
  try {
    const departmentId = Number(req.params.id);
    const { name, description } = req.body;

    // Validate department ID
    if (!Number.isInteger(departmentId) || departmentId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid department ID",
      });
    }

    // At least one field must be provided
    if (name === undefined && description === undefined) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update",
      });
    }

    // Validate department name
    if (
      name !== undefined &&
      (
        typeof name !== "string" ||
        name.trim().length < 2 ||
        name.trim().length > 100
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Department name must contain 2–100 characters",
      });
    }

    // Validate description
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

    const department = await prisma.department.update({
      where: {
        id: departmentId,
      },
      data: {
        ...(name !== undefined && {
          name: name.trim(),
        }),

        ...(description !== undefined && {
          description:
            typeof description === "string"
              ? description.trim() || null
              : null,
        }),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Department updated successfully",
      data: department,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return res.status(404).json({
          success: false,
          message: "Department not found",
        });
      }

      if (error.code === "P2002") {
        return res.status(409).json({
          success: false,
          message: "A department with this name already exists",
        });
      }
    }

    console.error("UPDATE DEPARTMENT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update department",
    });
  }
}

// ==========================================
// 5. DELETE DEPARTMENT
// ==========================================

export async function deleteDepartment(
  req: Request,
  res: Response
) {
  try {
    const departmentId = Number(req.params.id);

    // Validate department ID
    if (!Number.isInteger(departmentId) || departmentId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid department ID",
      });
    }

    // Check whether department exists
    const department = await prisma.department.findUnique({
      where: {
        id: departmentId,
      },
      include: {
        _count: {
          select: {
            doctors: true,
          },
        },
      },
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    // Prevent deleting departments with assigned doctors
    if (department._count.doctors > 0) {
      return res.status(409).json({
        success: false,
        message: "Cannot delete a department that has doctors assigned",
      });
    }

    await prisma.department.delete({
      where: {
        id: departmentId,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Department deleted successfully",
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return res.status(404).json({
          success: false,
          message: "Department not found",
        });
      }

      if (error.code === "P2003") {
        return res.status(409).json({
          success: false,
          message: "Cannot delete this department because it is referenced by other records",
        });
      }
    }

    console.error("DELETE DEPARTMENT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete department",
    });
  }
}
