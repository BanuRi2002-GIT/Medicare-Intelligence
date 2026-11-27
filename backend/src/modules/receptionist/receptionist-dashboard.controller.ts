
import type { Response } from "express";
import { fromZonedTime } from "date-fns-tz";
import { prisma } from "../../lib/prisma";
import type { AuthenticatedRequest } from "../../middlewares/auth.types";

const CLINIC_TIME_ZONE =
  process.env.CLINIC_TIME_ZONE || "Asia/Colombo";

export async function getReceptionistDashboard(
  _req: AuthenticatedRequest,
  res: Response,
) {
  try {
    // Calculate today's boundaries in the clinic's timezone.
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: CLINIC_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const tomorrowDate = new Date(`${today}T00:00:00Z`);
    tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);

    const tomorrow = tomorrowDate.toISOString().slice(0, 10);

    const todayStart = fromZonedTime(
      `${today}T00:00:00`,
      CLINIC_TIME_ZONE,
    );

    const tomorrowStart = fromZonedTime(
      `${tomorrow}T00:00:00`,
      CLINIC_TIME_ZONE,
    );

    const now = new Date();

    const [
      totalPatients,
      totalDoctors,
      totalAppointments,
      todayAppointments,
      pendingAppointments,
      confirmedAppointments,
      cancelledToday,
      upcomingAppointments,
      recentAppointments,
    ] = await prisma.$transaction([
      prisma.patient.count(),

      prisma.doctor.count({
        where: {
          user: {
            status: "ACTIVE",
          },
        },
      }),

      prisma.appointment.count(),

      prisma.appointment.count({
        where: {
          startAt: {
            gte: todayStart,
            lt: tomorrowStart,
          },
        },
      }),

      prisma.appointment.count({
        where: {
          status: "PENDING",
        },
      }),

      prisma.appointment.count({
        where: {
          status: "CONFIRMED",
        },
      }),

      prisma.appointment.count({
        where: {
          status: "CANCELLED",
          startAt: {
            gte: todayStart,
            lt: tomorrowStart,
          },
        },
      }),

      prisma.appointment.findMany({
        where: {
          startAt: {
            gte: now,
          },
          status: {
            in: ["PENDING", "CONFIRMED"],
          },
        },
        include: {
          patient: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
            },
          },
          doctor: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: {
          startAt: "asc",
        },
        take: 5,
      }),

      prisma.appointment.findMany({
        include: {
          patient: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          doctor: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Receptionist dashboard retrieved successfully",
      data: {
        summary: {
          totalPatients,
          totalDoctors,
          totalAppointments,
          todayAppointments,
          pendingAppointments,
          confirmedAppointments,
          cancelledToday,
        },

        upcomingAppointments: upcomingAppointments.map((appointment) => ({
          id: appointment.id,
          startAt: appointment.startAt,
          endAt: appointment.endAt,
          status: appointment.status,
          patient: {
            firstName: appointment.patient.user.firstName,
            lastName: appointment.patient.user.lastName,
            phone: appointment.patient.user.phone,
          },
          doctor: {
            firstName: appointment.doctor.user.firstName,
            lastName: appointment.doctor.user.lastName,
          },
        })),

        recentAppointments: recentAppointments.map((appointment) => ({
          id: appointment.id,
          createdAt: appointment.createdAt,
          startAt: appointment.startAt,
          status: appointment.status,
          patient: {
            firstName: appointment.patient.user.firstName,
            lastName: appointment.patient.user.lastName,
          },
          doctor: {
            firstName: appointment.doctor.user.firstName,
            lastName: appointment.doctor.user.lastName,
          },
        })),
      },
    });
  } catch (error) {
    console.error("RECEPTIONIST DASHBOARD ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve receptionist dashboard",
    });
  }
}
