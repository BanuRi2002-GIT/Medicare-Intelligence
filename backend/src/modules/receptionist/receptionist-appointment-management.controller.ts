
import type { Response } from "express";
import { z } from "zod";
import { fromZonedTime } from "date-fns-tz";

import { prisma } from "../../lib/prisma";
import type { AuthenticatedRequest } from "../../middlewares/auth.types";
import { createNotification } from "../notifications/notification.service";

const CLINIC_TIME_ZONE =
  process.env.CLINIC_TIME_ZONE || "Asia/Colombo";

// ==========================================
// VALIDATION SCHEMA
// ==========================================

const appointmentQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),

  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "COMPLETED",
    "CANCELLED",
    "REJECTED",
    "NO_SHOW",
  ]).optional(),

  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),

  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ==========================================
// 1. GET RECEPTIONIST APPOINTMENTS
// ==========================================

export async function getReceptionistAppointments(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const parsed = appointmentQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment search parameters",
        errors: parsed.error.flatten(),
      });
    }

    const { search, status, date, page, limit } = parsed.data;

    const where: any = {};

    // Filter by appointment status
    if (status) {
      where.status = status;
    }

    // Filter by clinic-local appointment date
    if (date) {
      const parsedDate = new Date(`${date}T00:00:00Z`);

      if (
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== date
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid appointment date",
        });
      }

      const nextDate = new Date(parsedDate);
      nextDate.setUTCDate(nextDate.getUTCDate() + 1);

      const startAt = fromZonedTime(
        `${date}T00:00:00`,
        CLINIC_TIME_ZONE,
      );

      const endAt = fromZonedTime(
        `${nextDate.toISOString().slice(0, 10)}T00:00:00`,
        CLINIC_TIME_ZONE,
      );

      where.startAt = {
        gte: startAt,
        lt: endAt,
      };
    }

    // Search by appointment ID or patient details
    if (search) {
      const numericId = Number(search);

      where.OR = [
        ...(Number.isSafeInteger(numericId) && numericId > 0
          ? [{ id: numericId }]
          : []),

        {
          patient: {
            user: {
              OR: [
                { firstName: { contains: search } },
                { lastName: { contains: search } },
                { email: { contains: search } },
              ],
            },
          },
        },
      ];
    }

    // Retrieve appointments and total count
    const [appointments, total] = await prisma.$transaction([
      prisma.appointment.findMany({
        where,

        include: {
          patient: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
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

              department: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },

        orderBy: {
          startAt: "desc",
        },

        skip: (page - 1) * limit,
        take: limit,
      }),

      prisma.appointment.count({ where }),
    ]);

    return res.status(200).json({
      success: true,

      data: appointments.map((appointment) => ({
        id: appointment.id,
        startAt: appointment.startAt,
        endAt: appointment.endAt,
        status: appointment.status,
        reason: appointment.reason,
        rejectionReason: appointment.rejectionReason,

        patient: {
          id: appointment.patient.id,
          userId: appointment.patient.user.id,
          firstName: appointment.patient.user.firstName,
          lastName: appointment.patient.user.lastName,
          email: appointment.patient.user.email,
          phone: appointment.patient.user.phone,
        },

        doctor: {
          id: appointment.doctor.id,
          firstName: appointment.doctor.user.firstName,
          lastName: appointment.doctor.user.lastName,
          department: appointment.doctor.department?.name ?? null,
        },
      })),

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error("GET RECEPTIONIST APPOINTMENTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve appointments",
    });
  }
}

// ==========================================
// 2. CANCEL RECEPTIONIST APPOINTMENT
// ==========================================

export async function cancelReceptionistAppointment(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const receptionistId = req.user?.id;
    const appointmentId = Number(req.params.id);

    if (!receptionistId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (
      !Number.isSafeInteger(appointmentId) ||
      appointmentId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID",
      });
    }

    // Cancel only pending or confirmed appointments.
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.appointment.updateMany({
        where: {
          id: appointmentId,
          status: {
            in: ["PENDING", "CONFIRMED"],
          },
        },

        data: {
          status: "CANCELLED",
        },
      });

      if (updated.count === 0) {
        const existing = await tx.appointment.findUnique({
          where: { id: appointmentId },
          select: {
            id: true,
            status: true,
          },
        });

        return {
          updated: false as const,
          existing,
        };
      }

      const appointment = await tx.appointment.findUnique({
        where: {
          id: appointmentId,
        },

        include: {
          patient: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
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
      });

      if (!appointment) {
        throw new Error("Appointment could not be retrieved");
      }

      return {
        updated: true as const,
        appointment,
      };
    });

    if (!result.updated) {
      if (!result.existing) {
        return res.status(404).json({
          success: false,
          message: "Appointment not found",
        });
      }

      return res.status(409).json({
        success: false,
        message: `This appointment cannot be cancelled because its status is ${result.existing.status}`,
      });
    }

    const appointment = result.appointment;

    // Record receptionist action in audit log.
    try {
      await prisma.auditLog.create({
        data: {
          userId: receptionistId,
          action: "UPDATE",
          entity: "Appointment",
          entityId: appointmentId,
          description: "Receptionist cancelled an appointment",
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"] ?? null,
        },
      });
    } catch (auditError) {
      console.error(
        "APPOINTMENT CANCELLATION AUDIT ERROR:",
        auditError,
      );
    }

    // Notify the patient.
    try {
      await createNotification({
        userId: appointment.patient.user.id,
        email: appointment.patient.user.email,
        title: "Appointment cancelled",
        message: `Your appointment with Dr. ${appointment.doctor.user.firstName} ${appointment.doctor.user.lastName} has been cancelled.`,
        type: "APPOINTMENT_CANCELLED",
      });
    } catch (notificationError) {
      console.error(
        "APPOINTMENT CANCELLATION NOTIFICATION ERROR:",
        notificationError,
      );
    }

    return res.status(200).json({
      success: true,
      message: "Appointment cancelled successfully",

      data: {
        appointmentId,
        status: "CANCELLED",
      },
    });

  } catch (error) {
    console.error("CANCEL RECEPTIONIST APPOINTMENT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to cancel appointment",
    });
  }
}
