
import type { Request, Response } from "express";
import { fromZonedTime } from "date-fns-tz";
import { prisma } from "../../lib/prisma";

const CLINIC_TIME_ZONE =
  process.env.CLINIC_TIME_ZONE || "Asia/Colombo";

const SLOT_DURATION_MINUTES = 30;

export async function getAvailableSlots(
  req: Request,
  res: Response
) {
  try {
    const doctorId = Number(req.params.doctorId);
    const date = req.query.date;

    // ==========================================
    // 1. VALIDATE DOCTOR ID
    // ==========================================

    if (!Number.isInteger(doctorId) || doctorId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID",
      });
    }

    // ==========================================
    // 2. VALIDATE DATE
    // ==========================================

    if (
      typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide a date in YYYY-MM-DD format",
      });
    }

    // Validate that the date actually exists.
    const calendarDate = new Date(`${date}T00:00:00.000Z`);

    if (
      Number.isNaN(calendarDate.getTime()) ||
      calendarDate.toISOString().slice(0, 10) !== date
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid calendar date",
      });
    }

    const dayOfWeek = calendarDate.getUTCDay();

    // ==========================================
    // 3. CHECK DOCTOR EXISTS AND IS ACTIVE
    // ==========================================

    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      select: {
        id: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            status: true,
          },
        },
      },
    });

    if (!doctor || doctor.user.status !== "ACTIVE") {
      return res.status(404).json({
        success: false,
        message: "Doctor not found or inactive",
      });
    }

    // ==========================================
    // 4. CHECK DOCTOR LEAVE
    // ==========================================

    const leave = await prisma.doctorLeave.findUnique({
      where: {
        doctorId_leaveDate: {
          doctorId,
          leaveDate: calendarDate,
        },
      },
    });

    if (leave) {
      return res.status(200).json({
        success: true,
        message: "Doctor is unavailable on this date",
        data: {
          doctorId,
          date,
          availableSlots: [],
        },
      });
    }

    // ==========================================
    // 5. GET DOCTOR WORKING SCHEDULES
    // ==========================================

    const schedules = await prisma.doctorSchedule.findMany({
      where: {
        doctorId,
        dayOfWeek,
        isAvailable: true,
      },
      orderBy: {
        startTime: "asc",
      },
    });

    if (schedules.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No working hours are available on this date",
        data: {
          doctorId,
          date,
          availableSlots: [],
        },
      });
    }

    // ==========================================
    // 6. CALCULATE CLINIC DAY START AND END
    // ==========================================

    const dayStart = fromZonedTime(
      `${date}T00:00:00`,
      CLINIC_TIME_ZONE
    );

    const nextDate = new Date(calendarDate);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);

    const nextDateString = nextDate.toISOString().slice(0, 10);

    const dayEnd = fromZonedTime(
      `${nextDateString}T00:00:00`,
      CLINIC_TIME_ZONE
    );

    // ==========================================
    // 7. GET EXISTING APPOINTMENTS
    // ==========================================

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        status: {
          in: ["PENDING", "CONFIRMED"],
        },
        startAt: { lt: dayEnd },
        endAt: { gt: dayStart },
      },
      select: {
        startAt: true,
        endAt: true,
      },
    });

    // ==========================================
    // 8. GENERATE AVAILABLE APPOINTMENT SLOTS
    // ==========================================

    const now = new Date();

    const availableSlots: {
      startAt: string;
      endAt: string;
    }[] = [];

    for (const schedule of schedules) {
      const [startHour, startMinute] = schedule.startTime
        .split(":")
        .map(Number);

      const [endHour, endMinute] = schedule.endTime
        .split(":")
        .map(Number);

      const scheduleStartMinutes = startHour * 60 + startMinute;
      const scheduleEndMinutes = endHour * 60 + endMinute;

      for (
        let minute = scheduleStartMinutes;
        minute + SLOT_DURATION_MINUTES <= scheduleEndMinutes;
        minute += SLOT_DURATION_MINUTES
      ) {
        const slotStartTime =
          `${String(Math.floor(minute / 60)).padStart(2, "0")}:` +
          `${String(minute % 60).padStart(2, "0")}`;

        const slotEndMinute = minute + SLOT_DURATION_MINUTES;

        const slotEndTime =
          `${String(Math.floor(slotEndMinute / 60)).padStart(2, "0")}:` +
          `${String(slotEndMinute % 60).padStart(2, "0")}`;

        const slotStart = fromZonedTime(
          `${date}T${slotStartTime}:00`,
          CLINIC_TIME_ZONE
        );

        const slotEnd = fromZonedTime(
          `${date}T${slotEndTime}:00`,
          CLINIC_TIME_ZONE
        );

        // Skip slots that have already started.
        if (slotStart <= now) {
          continue;
        }

        // Check whether the slot overlaps an existing appointment.
        const isBooked = existingAppointments.some(
          (appointment) =>
            appointment.startAt < slotEnd &&
            appointment.endAt > slotStart
        );

        if (!isBooked) {
          availableSlots.push({
            startAt: slotStart.toISOString(),
            endAt: slotEnd.toISOString(),
          });
        }
      }
    }

    // ==========================================
    // 9. RETURN AVAILABLE SLOTS
    // ==========================================

    return res.status(200).json({
      success: true,
      message: "Available appointment slots retrieved successfully",
      data: {
        doctor: {
          id: doctor.id,
          name: `${doctor.user.firstName} ${doctor.user.lastName}`,
        },
        date,
        timeZone: CLINIC_TIME_ZONE,
        slotDurationMinutes: SLOT_DURATION_MINUTES,
        availableSlots,
      },
    });
  } catch (error) {
    console.error("GET AVAILABLE SLOTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve available appointment slots",
    });
  }
}
