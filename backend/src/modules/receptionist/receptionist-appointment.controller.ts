
import type { Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import type { AuthenticatedRequest } from "../../middlewares/auth.types";
import { receptionistBookingSchema } from "./receptionist-appointment.validation";
import { createSecureAppointment } from "../appointments/appointment-booking.service";

export async function bookAppointmentForPatient(
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

    const validation = receptionistBookingSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment details",
        errors: z.treeifyError(validation.error),
      });
    }

    const input = validation.data;

    // Confirm that the selected patient exists.
    const patient = await prisma.patient.findUnique({
      where: { id: input.patientId },
      select: {
        id: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Reuse the same booking service used by patient bookings.
    const appointment = await createSecureAppointment({
      patientId: patient.id,
      doctorId: input.doctorId,
      startAt: new Date(input.startAt),
      endAt: new Date(input.endAt),
      reason: input.reason,
    });

    // Record who arranged the booking.
    // This assumes your AuditLog service accepts these fields.
    try {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: "CREATE",
          entity: "APPOINTMENT",
          entityId: String(appointment.id),
          description: `Receptionist created appointment ${appointment.id} for patient ${patient.id}`,
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        },
      });
    } catch (auditError) {
      console.error("RECEPTIONIST BOOKING AUDIT ERROR:", auditError);
    }

    return res.status(201).json({
      success: true,
      message: "Appointment booked successfully and is awaiting doctor confirmation",
      appointment,
    });
  } catch (error) {
    console.error("RECEPTIONIST APPOINTMENT BOOKING ERROR:", error);

    const knownErrors: Record<string, string> = {
      INVALID_APPOINTMENT_TIME: "Invalid appointment time",
      APPOINTMENT_MUST_BE_IN_FUTURE: "Appointment must be in the future",
      DOCTOR_NOT_FOUND: "Doctor not found",
      DOCTOR_NOT_AVAILABLE: "Doctor is not available",
      PATIENT_NOT_FOUND: "Patient not found",
      INVALID_APPOINTMENT_DATE: "Invalid appointment date",
      DOCTOR_ON_LEAVE: "Doctor is on leave for this date",
      OUTSIDE_DOCTOR_SCHEDULE: "Selected time is outside the doctor's schedule",
      DOCTOR_SLOT_ALREADY_BOOKED: "This doctor already has an appointment at that time",
      PATIENT_HAS_OVERLAPPING_APPOINTMENT: "Patient already has an overlapping appointment",
    };

    if (error instanceof Error && knownErrors[error.message]) {
      return res.status(409).json({
        success: false,
        message: knownErrors[error.message],
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to book appointment",
    });
  }
}
