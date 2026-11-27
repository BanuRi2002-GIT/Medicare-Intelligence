
import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";

// GET ALL DOCTORS
export async function getDoctors(
  _req: Request,
  res: Response
) {
  try {
    const doctors = await prisma.doctor.findMany({
      select: {
        id: true,
        specialization: true,
        qualifications: true,
        experienceYears: true,
        consultationFee: true,
        currencyCode: true,

        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },

        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        id: "asc",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Doctors retrieved successfully",
      data: doctors,
    });
  } catch (error) {
    console.error("Get doctors error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve doctors",
    });
  }
}

// GET DOCTOR BY ID
export async function getDoctorById(
  req: Request,
  res: Response
) {
  try {
    const doctorId = Number(req.params.id);

    if (!Number.isInteger(doctorId) || doctorId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID",
      });
    }

    const doctor = await prisma.doctor.findUnique({
      where: {
        id: doctorId,
      },
      select: {
        id: true,
        specialization: true,
        qualifications: true,
        experienceYears: true,
        consultationFee: true,
        currencyCode: true,

        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },

        department: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },

        schedules: {
          select: {
            id: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            isAvailable: true,
          },
        },
      },
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Doctor retrieved successfully",
      data: doctor,
    });
  } catch (error) {
    console.error("Get doctor error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve doctor",
    });
  }
}
