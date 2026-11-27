
import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.types";
import { prisma } from "../../lib/prisma";

export async function getAdminDashboard(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const now = new Date();

    const thirtyDaysAgo = new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000
    );

    // ==========================================
    // 1. FETCH ADMIN DASHBOARD STATISTICS
    // ==========================================

    const [
      totalPatients,
      totalDoctors,
      totalAppointments,
      totalDepartments,
      activeUsers,
      upcomingAppointments,
      appointmentsLast30Days,
      appointmentStatusCounts,
      recentAppointments,
    ] = await Promise.all([
      // Total patients
      prisma.patient.count(),

      // Total doctors
      prisma.doctor.count(),

      // Total appointments
      prisma.appointment.count(),

      // Total departments
      prisma.department.count(),

      // Active users
      prisma.user.count({
        where: {
          status: "ACTIVE",
        },
      }),

      // Upcoming appointments
      prisma.appointment.count({
        where: {
          startAt: {
            gte: now,
          },
          status: {
            in: ["PENDING", "CONFIRMED"],
          },
        },
      }),

      // Appointments created during the last 30 days
      prisma.appointment.count({
        where: {
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      }),

      // Appointment counts grouped by status
      prisma.appointment.groupBy({
        by: ["status"],
        _count: {
          _all: true,
        },
      }),

      // Latest 10 appointments
      prisma.appointment.findMany({
        take: 10,
        orderBy: {
          createdAt: "desc",
        },
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
      }),
    ]);

    // ==========================================
    // 2. APPOINTMENT STATUS ANALYTICS
    // ==========================================

    const appointmentsByStatus: Record<string, number> = {
      PENDING: 0,
      CONFIRMED: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      NO_SHOW: 0,
    };

    for (const item of appointmentStatusCounts) {
      appointmentsByStatus[item.status] = item._count._all;
    }

    const completedAppointments =
      appointmentsByStatus.COMPLETED;

    const cancelledAppointments =
      appointmentsByStatus.CANCELLED;

    const noShowAppointments =
      appointmentsByStatus.NO_SHOW;

    // ==========================================
    // 3. APPOINTMENT COMPLETION RATE
    // ==========================================

    const appointmentCompletionRate =
      totalAppointments > 0
        ? Number(
            (
              (completedAppointments / totalAppointments) *
              100
            ).toFixed(2)
          )
        : 0;

    // ==========================================
    // 4. RECENT APPOINTMENTS
    // ==========================================

    const formattedRecentAppointments =
      recentAppointments.map((appointment) => ({
        id: appointment.id,
        startAt: appointment.startAt,
        endAt: appointment.endAt,
        status: appointment.status,

        patientName:
          `${appointment.patient.user.firstName} ${appointment.patient.user.lastName}`,

        doctorName:
          `${appointment.doctor.user.firstName} ${appointment.doctor.user.lastName}`,
      }));

    // ==========================================
    // 5. RETURN ADMIN DASHBOARD RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,
      message: "Admin dashboard data retrieved successfully",

      data: {
        // Admin information from authentication middleware
        admin: {
          userId: req.user?.id,
          role: "ADMIN",
          dashboard: "MediCare Intelligence Administration",
        },

        // Dashboard overview
        overview: {
          totalPatients,
          totalDoctors,
          totalAppointments,
          totalDepartments,
          activeUsers,
          upcomingAppointments,
        },

        // Appointment analytics
        appointmentAnalytics: {
          appointmentsLast30Days,
          appointmentsByStatus,
          completedAppointments,
          cancelledAppointments,
          noShowAppointments,
          appointmentCompletionRate,
        },

        // Latest appointments
        recentAppointments: formattedRecentAppointments,

        // Dashboard generation timestamp
        generatedAt: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("ADMIN DASHBOARD ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve admin dashboard data",
    });
  }
}
