import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import {
  createScheduleSchema,
  updateScheduleSchema,
} from "./schedule.validation";
import type { AuthenticatedRequest } from "../../middlewares/auth.types";

export async function getMySchedules(
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

    const schedules = await prisma.doctorSchedule.findMany({
      where: { doctorId: doctor.id },
      orderBy: [
        { dayOfWeek: "asc" },
        { startTime: "asc" },
      ],
    });

    return res.status(200).json({
      success: true,
      data: schedules,
    });
  } catch (error) {
    console.error("GET DOCTOR SCHEDULES ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve schedules",
    });
  }
}

export async function createSchedule(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const validation = createScheduleSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid schedule details",
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

    const input = validation.data;

    const existingSchedules = await prisma.doctorSchedule.findMany({
      where: {
        doctorId: doctor.id,
        dayOfWeek: input.dayOfWeek,
        isAvailable: true,
      },
    });

    const hasOverlap = existingSchedules.some(
      (schedule) =>
        input.startTime < schedule.endTime &&
        input.endTime > schedule.startTime
    );

    if (hasOverlap) {
      return res.status(409).json({
        success: false,
        message: "This schedule overlaps with an existing working period",
      });
    }

    const schedule = await prisma.doctorSchedule.create({
      data: {
        ...input,
        doctorId: doctor.id,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Doctor schedule created successfully",
      data: schedule,
    });
  } catch (error) {
    console.error("CREATE DOCTOR SCHEDULE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create doctor schedule",
    });
  }
}

export async function updateSchedule(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const scheduleId = Number(req.params.id);

    if (!Number.isInteger(scheduleId) || scheduleId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid schedule ID",
      });
    }

    const validation = updateScheduleSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid schedule details",
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

    const existing = await prisma.doctorSchedule.findFirst({
      where: {
        id: scheduleId,
        doctorId: doctor.id,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found",
      });
    }

    const input = validation.data;

    const updatedStart = input.startTime ?? existing.startTime;
    const updatedEnd = input.endTime ?? existing.endTime;
    const updatedDay = input.dayOfWeek ?? existing.dayOfWeek;
    const updatedAvailable = input.isAvailable ?? existing.isAvailable;

    if (updatedStart >= updatedEnd) {
      return res.status(400).json({
        success: false,
        message: "End time must be later than start time",
      });
    }

    if (updatedAvailable) {
      const otherSchedules = await prisma.doctorSchedule.findMany({
        where: {
          doctorId: doctor.id,
          dayOfWeek: updatedDay,
          isAvailable: true,
          NOT: { id: scheduleId },
        },
      });

      const hasOverlap = otherSchedules.some(
        (schedule) =>
          updatedStart < schedule.endTime &&
          updatedEnd > schedule.startTime
      );

      if (hasOverlap) {
        return res.status(409).json({
          success: false,
          message: "This schedule overlaps with another working period",
        });
      }
    }

    const updatedSchedule = await prisma.doctorSchedule.update({
      where: { id: scheduleId },
      data: input,
    });

    return res.status(200).json({
      success: true,
      message: "Schedule updated successfully",
      data: updatedSchedule,
    });
  } catch (error) {
    console.error("UPDATE DOCTOR SCHEDULE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update schedule",
    });
  }
}

export async function deleteSchedule(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const scheduleId = Number(req.params.id);

    if (!Number.isInteger(scheduleId) || scheduleId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid schedule ID",
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

    const result = await prisma.doctorSchedule.deleteMany({
      where: {
        id: scheduleId,
        doctorId: doctor.id,
      },
    });

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Schedule deleted successfully",
    });
  } catch (error) {
    console.error("DELETE DOCTOR SCHEDULE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete schedule",
    });
  }
}