import type { Response } from "express";
import { prisma } from "../../lib/prisma";
import type { AuthenticatedRequest } from "../../middlewares/auth.types";
import { createLeaveSchema } from "./leave.validation";

export async function getMyLeaves(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { userId: req.user!.id },
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor profile not found",
      });
    }

    const leaves = await prisma.doctorLeave.findMany({
      where: {
        doctorId: doctor.id,
      },
      orderBy: {
        leaveDate: "asc",
      },
    });

    return res.status(200).json({
      success: true,
      data: leaves,
    });
  } catch (error) {
    console.error("GET DOCTOR LEAVES ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve doctor leave dates",
    });
  }
}

export async function createLeave(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const validation = createLeaveSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid leave details",
        errors: validation.error.flatten(),
      });
    }

    const doctor = await prisma.doctor.findUnique({
      where: { userId: req.user!.id },
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor profile not found",
      });
    }

    const { leaveDate, reason } = validation.data;

    const parsedDate = new Date(`${leaveDate}T00:00:00.000Z`);

    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== leaveDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid leave date",
      });
    }

    const today = new Date();
    const todayInColombo = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Colombo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(today);

    if (leaveDate < todayInColombo) {
      return res.status(400).json({
        success: false,
        message: "Leave date cannot be in the past",
      });
    }

    // Do not allow leave dates that already have booked appointments.
    const startOfLeaveDay = new Date(`${leaveDate}T00:00:00.000Z`);
    const endOfLeaveDay = new Date(
      startOfLeaveDay.getTime() + 24 * 60 * 60 * 1000
    );

    const existingAppointments = await prisma.appointment.count({
      where: {
        doctorId: doctor.id,
        status: {
          in: ["PENDING", "CONFIRMED"],
        },
        startAt: { lt: endOfLeaveDay },
        endAt: { gt: startOfLeaveDay },
      },
    });

    if (existingAppointments > 0) {
      return res.status(409).json({
        success: false,
        message:
          "This date has existing appointments. Reschedule or cancel them before adding leave.",
      });
    }

    const leave = await prisma.doctorLeave.create({
      data: {
        doctorId: doctor.id,
        leaveDate: parsedDate,
        reason,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Doctor leave date created successfully",
      data: leave,
    });
  } catch (error) {
    console.error("CREATE DOCTOR LEAVE ERROR:", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        success: false,
        message: "Leave has already been recorded for this date",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create doctor leave",
    });
  }
}

export async function deleteLeave(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const leaveId = Number(req.params.id);

    if (!Number.isInteger(leaveId) || leaveId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid leave ID",
      });
    }

    const doctor = await prisma.doctor.findUnique({
      where: { userId: req.user!.id },
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor profile not found",
      });
    }

    const result = await prisma.doctorLeave.deleteMany({
      where: {
        id: leaveId,
        doctorId: doctor.id,
      },
    });

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        message: "Leave record not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Leave date deleted successfully",
    });
  } catch (error) {
    console.error("DELETE DOCTOR LEAVE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete leave date",
    });
  }
}