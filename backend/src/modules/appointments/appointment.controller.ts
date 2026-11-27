
import type { Response } from "express";
import { prisma } from "../../lib/prisma";
import type { AuthenticatedRequest } from "../../middlewares/auth.types";
import { createAppointmentSchema } from "./appointment.validation";
import { createNotification } from "../notifications/notification.service";
import { scheduleAppointmentReminder } from "../notifications/appointment-reminder.service";

// ==========================================
// 1. BOOK APPOINTMENT
// ==========================================

export async function createAppointment(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const input = createAppointmentSchema.parse(req.body);

    // Find patient profile
    const patient = await prisma.patient.findUnique({
      where: {
        userId: req.user!.id,
      },
      select: {
        id: true,
      },
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found",
      });
    }

    const startAt = new Date(input.startAt);
    const endAt = new Date(input.endAt);

    if (
      Number.isNaN(startAt.getTime()) ||
      Number.isNaN(endAt.getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment date or time",
      });
    }

    if (startAt <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Appointment must be in the future",
      });
    }

    if (endAt <= startAt) {
      return res.status(400).json({
        success: false,
        message: "Appointment end time must be after start time",
      });
    }

    // Check doctor
    const doctor = await prisma.doctor.findUnique({
      where: {
        id: input.doctorId,
      },
      select: {
        id: true,
      },
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // Create appointment
    const appointment = await prisma.$transaction(async (tx) => {
      const doctorConflict = await tx.appointment.findFirst({
        where: {
          doctorId: input.doctorId,
          status: {
            in: ["PENDING", "CONFIRMED"],
          },
          startAt: {
            lt: endAt,
          },
          endAt: {
            gt: startAt,
          },
        },
      });

      if (doctorConflict) {
        throw new Error("DOCTOR_TIME_CONFLICT");
      }

      const patientConflict = await tx.appointment.findFirst({
        where: {
          patientId: patient.id,
          status: {
            in: ["PENDING", "CONFIRMED"],
          },
          startAt: {
            lt: endAt,
          },
          endAt: {
            gt: startAt,
          },
        },
      });

      if (patientConflict) {
        throw new Error("PATIENT_TIME_CONFLICT");
      }

      return tx.appointment.create({
        data: {
          patientId: patient.id,
          doctorId: input.doctorId,
          startAt,
          endAt,
          reason: input.reason,
          status: "PENDING",
        },
        include: {
          doctor: {
            select: {
              specialization: true,
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
    });

    // Send booking notification to patient
    try {
      const patientUser = await prisma.user.findUnique({
        where: {
          id: req.user!.id,
        },
        select: {
          id: true,
          email: true,
        },
      });

      if (patientUser) {
        await createNotification({
          userId: patientUser.id,
          email: patientUser.email,
          title: "Appointment booked",
          message: "Your appointment booking has been received.",
          type: "APPOINTMENT_BOOKED",
        });
      }
    } catch (notificationError) {
      console.error(
        "APPOINTMENT NOTIFICATION ERROR:",
        notificationError
      );
    }

    return res.status(201).json({
      success: true,
      message: "Appointment booked successfully",
      data: appointment,
    });

  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "DOCTOR_TIME_CONFLICT") {
        return res.status(409).json({
          success: false,
          message: "Doctor already has an appointment during this time",
        });
      }

      if (error.message === "PATIENT_TIME_CONFLICT") {
        return res.status(409).json({
          success: false,
          message: "You already have an appointment during this time",
        });
      }
    }

    console.error("Create appointment error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to book appointment",
    });
  }
}

// ==========================================
// 2. GET MY APPOINTMENTS
// ==========================================

export async function getMyAppointments(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const patient = await prisma.patient.findUnique({
      where: {
        userId: req.user!.id,
      },
      select: {
        id: true,
      },
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found",
      });
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        patientId: patient.id,
      },
      include: {
        doctor: {
          select: {
            specialization: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            department: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        startAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Appointments retrieved successfully",
      data: appointments,
    });

  } catch (error) {
    console.error("Get appointments error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve appointments",
    });
  }
}

// ==========================================
// 3. CANCEL APPOINTMENT
// ==========================================

export async function cancelAppointment(
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

    const appointmentId = Number(req.params.id);

    if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID",
      });
    }

    // Find appointment belonging to logged-in patient
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        patient: {
          userId: req.user.id,
        },
        status: {
          in: ["PENDING", "CONFIRMED"],
        },
      },
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found or cannot be cancelled",
      });
    }

    // Cancel appointment
    const result = await prisma.appointment.updateMany({
      where: {
        id: appointmentId,
        patientId: appointment.patientId,
        status: {
          in: ["PENDING", "CONFIRMED"],
        },
      },
      data: {
        status: "CANCELLED",
      },
    });

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found or cannot be cancelled",
      });
    }

    // Find doctor who owns this appointment
    const cancelledAppointment = await prisma.appointment.findUnique({
      where: {
        id: appointmentId,
      },
      include: {
        doctor: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Send cancellation notification to doctor
    if (cancelledAppointment) {
      try {
        await createNotification({
          userId: cancelledAppointment.doctor.user.id,
          email: cancelledAppointment.doctor.user.email,
          title: "Appointment cancelled",
          message: "A patient has cancelled an appointment with you.",
          type: "APPOINTMENT_CANCELLED",
        });

      } catch (notificationError) {
        console.error(
          "CANCELLATION NOTIFICATION ERROR:",
          notificationError
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: "Appointment cancelled successfully",
    });

  } catch (error) {
    console.error("CANCEL APPOINTMENT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to cancel appointment",
    });
  }
}

// ==========================================
// 4. RESCHEDULE APPOINTMENT
// ==========================================

export async function rescheduleAppointment(
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

    const appointmentId = Number(req.params.id);

    if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID",
      });
    }

    // Get new appointment dates
    const {
      startAt: newStartAtValue,
      endAt: newEndAtValue,
    } = req.body;

    if (!newStartAtValue || !newEndAtValue) {
      return res.status(400).json({
        success: false,
        message: "New start time and end time are required",
      });
    }

    const newStartAt = new Date(newStartAtValue);
    const newEndAt = new Date(newEndAtValue);

    if (
      Number.isNaN(newStartAt.getTime()) ||
      Number.isNaN(newEndAt.getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment date or time",
      });
    }

    if (newStartAt <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Appointment must be in the future",
      });
    }

    if (newEndAt <= newStartAt) {
      return res.status(400).json({
        success: false,
        message: "Appointment end time must be after start time",
      });
    }

    // Find appointment belonging to logged-in patient
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        patient: {
          userId: req.user.id,
        },
        status: {
          in: ["PENDING", "CONFIRMED"],
        },
      },
    });

    if (!existingAppointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found or cannot be rescheduled",
      });
    }

    // Check doctor time conflict
    const doctorConflict = await prisma.appointment.findFirst({
      where: {
        id: {
          not: appointmentId,
        },
        doctorId: existingAppointment.doctorId,
        status: {
          in: ["PENDING", "CONFIRMED"],
        },
        startAt: {
          lt: newEndAt,
        },
        endAt: {
          gt: newStartAt,
        },
      },
    });

    if (doctorConflict) {
      return res.status(409).json({
        success: false,
        message: "Doctor already has an appointment during this time",
      });
    }

    // Check patient time conflict
    const patientConflict = await prisma.appointment.findFirst({
      where: {
        id: {
          not: appointmentId,
        },
        patientId: existingAppointment.patientId,
        status: {
          in: ["PENDING", "CONFIRMED"],
        },
        startAt: {
          lt: newEndAt,
        },
        endAt: {
          gt: newStartAt,
        },
      },
    });

    if (patientConflict) {
      return res.status(409).json({
        success: false,
        message: "You already have an appointment during this time",
      });
    }

    // Update appointment dates
    const updatedAppointment = await prisma.appointment.update({
      where: {
        id: appointmentId,
      },
      data: {
        startAt: newStartAt,
        endAt: newEndAt,
        status: "PENDING",
      },
    });

    // Send reschedule notification to doctor
    try {
      const appointmentWithDoctor = await prisma.appointment.findUnique({
        where: {
          id: updatedAppointment.id,
        },
        include: {
          doctor: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (appointmentWithDoctor) {
        await createNotification({
          userId: appointmentWithDoctor.doctor.user.id,
          email: appointmentWithDoctor.doctor.user.email,
          title: "Appointment rescheduled",
          message: `A patient has rescheduled an appointment. New date and time: ${updatedAppointment.startAt.toISOString()}.`,
          type: "APPOINTMENT_RESCHEDULED",
        });
      }

    } catch (notificationError) {
      console.error(
        "RESCHEDULE NOTIFICATION ERROR:",
        notificationError
      );
    }

    return res.status(200).json({
      success: true,
      message: "Appointment rescheduled successfully",
      data: updatedAppointment,
    });

  } catch (error) {
    console.error("RESCHEDULE APPOINTMENT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to reschedule appointment",
    });
  }
}

// ==========================================
// 5. CONFIRM APPOINTMENT (DOCTOR)
// ==========================================

export async function confirmAppointment(
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

    const appointmentId = Number(req.params.id);

    if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID",
      });
    }

    // Find logged-in doctor's profile
    const doctor = await prisma.doctor.findUnique({
      where: {
        userId: req.user.id,
      },
      select: {
        id: true,
      },
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor profile not found",
      });
    }

    // Confirm only this doctor's pending appointment
    const result = await prisma.appointment.updateMany({
      where: {
        id: appointmentId,
        doctorId: doctor.id,
        status: "PENDING",
      },
      data: {
        status: "CONFIRMED",
      },
    });

    if (result.count === 0) {
      return res.status(409).json({
        success: false,
        message: "Appointment not found or cannot be confirmed",
      });
    }

    // Get appointment and patient details
    const appointment = await prisma.appointment.findUnique({
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
      },
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // ==========================================
    // SCHEDULE APPOINTMENT REMINDER
    // ==========================================

    try {
      await scheduleAppointmentReminder(
        appointment.id,
        appointment.startAt
      );
    } catch (error) {
      console.error(
        "Failed to schedule appointment reminder:",
        error
      );
    }

    // ==========================================
    // SEND CONFIRMATION NOTIFICATION TO PATIENT
    // ==========================================

    try {
      await createNotification({
        userId: appointment.patient.user.id,
        email: appointment.patient.user.email,
        title: "Appointment confirmed",
        message: `Your appointment has been confirmed. Scheduled date and time: ${appointment.startAt.toISOString()}.`,
        type: "APPOINTMENT_CONFIRMED",
      });

    } catch (notificationError) {
      console.error(
        "APPOINTMENT CONFIRMATION NOTIFICATION ERROR:",
        notificationError
      );
    }

    return res.status(200).json({
      success: true,
      message: "Appointment confirmed successfully",
      data: appointment,
    });

  } catch (error) {
    console.error("CONFIRM APPOINTMENT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to confirm appointment",
    });
  }
}
