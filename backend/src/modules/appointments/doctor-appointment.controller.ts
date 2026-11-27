
import type { Response } from "express";
import { fromZonedTime } from "date-fns-tz";
import { prisma } from "../../lib/prisma";
import type { AuthenticatedRequest } from "../../middlewares/auth.types";

const CLINIC_TIME_ZONE =
  process.env.CLINIC_TIME_ZONE || "Asia/Colombo";

const VALID_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
  "NO_SHOW",
] as const;

type AppointmentStatus = (typeof VALID_STATUSES)[number];

export async function getDoctorAppointments(
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

    const date = req.query.date as string | undefined;
    const status = req.query.status as string | undefined;

    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);

    if (
      !Number.isInteger(page) ||
      !Number.isInteger(limit) ||
      page < 1 ||
      limit < 1 ||
      limit > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination values",
      });
    }

    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: "Date must use YYYY-MM-DD format",
      });
    }

    if (date) {
      const parsed = new Date(`${date}T00:00:00.000Z`);

      if (
        Number.isNaN(parsed.getTime()) ||
        parsed.toISOString().slice(0, 10) !== date
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid date",
        });
      }
    }

    if (
      status &&
      !VALID_STATUSES.includes(status as AppointmentStatus)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment status",
        allowedStatuses: VALID_STATUSES,
      });
    }

    const doctor = await prisma.doctor.findUnique({
      where: { userId: req.user.id },
      select: { id: true },
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor profile not found",
      });
    }

    let dateFilter: { gte: Date; lt: Date } | { gte: Date };

    if (date) {
      const nextDate = new Date(`${date}T00:00:00.000Z`);
      nextDate.setUTCDate(nextDate.getUTCDate() + 1);

      dateFilter = {
        gte: fromZonedTime(
          `${date}T00:00:00`,
          CLINIC_TIME_ZONE
        ),
        lt: fromZonedTime(
          `${nextDate.toISOString().slice(0, 10)}T00:00:00`,
          CLINIC_TIME_ZONE
        ),
      };
    } else {
      // Without a date, show appointments from the current time onward.
      dateFilter = { gte: new Date() };
    }

    const where = {
      doctorId: doctor.id,
      startAt: dateFilter,
      ...(status
        ? { status: status as AppointmentStatus }
        : {}),
    };

    const [appointments, total, groupedCounts] = await Promise.all([
      prisma.appointment.findMany({
        where,
        orderBy: { startAt: "asc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          startAt: true,
          endAt: true,
          status: true,
          reason: true,
          rejectionReason: true,
          patient: {
            select: {
              id: true,
              dateOfBirth: true,
              gender: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
            },
          },
        },
      }),

      prisma.appointment.count({ where }),

      prisma.appointment.groupBy({
        by: ["status"],
        where: {
          doctorId: doctor.id,
          startAt: dateFilter,
        },
        _count: { id: true },
      }),
    ]);

    const statusCounts = Object.fromEntries(
      VALID_STATUSES.map((item) => [item, 0])
    ) as Record<AppointmentStatus, number>;

    for (const item of groupedCounts) {
      statusCounts[item.status as AppointmentStatus] =
        item._count.id;
    }

    return res.status(200).json({
      success: true,
      message: "Doctor appointments retrieved successfully",
      filters: {
        date: date ?? null,
        status: status ?? null,
      },
      summary: statusCounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      appointments,
    });
  } catch (error) {
    console.error("GET DOCTOR APPOINTMENTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve doctor appointments",
    });
  }
}
