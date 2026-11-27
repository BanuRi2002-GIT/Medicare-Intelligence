
import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.types";
import { prisma } from "../../lib/prisma";
import { createNotification } from "../notifications/notification.service";
import { receptionistRescheduleSchema } from "./receptionist-reschedule.validation";
import { rescheduleSecureAppointment } from "./receptionist-reschedule.service";

export async function rescheduleReceptionistAppointment(
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

    const parsed = receptionistRescheduleSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid rescheduling details",
        errors: parsed.error.flatten(),
      });
    }

    const appointment = await rescheduleSecureAppointment({
      appointmentId,
      startAt: new Date(parsed.data.startAt),
      endAt: new Date(parsed.data.endAt),
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    try {
      await prisma.auditLog.create({
        data: {
          userId: receptionistId,
          action: "UPDATE",
          entity: "Appointment",
          entityId: appointmentId,
          description: "Receptionist rescheduled an appointment",
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"] ?? null,
        },
      });
    } catch (auditError) {
      console.error("RESCHEDULE AUDIT ERROR:", auditError);
    }

    try {
      await createNotification({
        userId: appointment.patient.user.id,
        email: appointment.patient.user.email,
        title: "Appointment rescheduled",
        message:
          "Your appointment has been moved to a new date and time. It is awaiting doctor confirmation.",
        type: "APPOINTMENT_RESCHEDULED",
      });
    } catch (notificationError) {
      console.error("RESCHEDULE NOTIFICATION ERROR:", notificationError);
    }

    return res.status(200).json({
      success: true,
      message: "Appointment rescheduled successfully and is awaiting confirmation",
      data: {
        id: appointment.id,
        startAt: appointment.startAt,
        endAt: appointment.endAt,
        status: appointment.status,
      },
    });
  } catch (error) {
    const errorCode =
      error instanceof Error ? error.message : "UNKNOWN_ERROR";

    const conflictErrors = [
      "DOCTOR_ON_LEAVE",
      "OUTSIDE_DOCTOR_SCHEDULE",
      "DOCTOR_SLOT_ALREADY_BOOKED",
      "PATIENT_HAS_OVERLAPPING_APPOINTMENT",
      "APPOINTMENT_CANNOT_BE_RESCHEDULED",
      "APPOINTMENT_STATUS_CHANGED",
      "APPOINTMENT_MUST_BE_WITHIN_ONE_DAY",
      "APPOINTMENT_MUST_BE_IN_FUTURE",
      "INVALID_APPOINTMENT_TIME",
      "DOCTOR_NOT_AVAILABLE",
    ];

    if (errorCode === "APPOINTMENT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    if (conflictErrors.includes(errorCode)) {
      return res.status(409).json({
        success: false,
        message: errorCode.replaceAll("_", " ").toLowerCase(),
      });
    }

    if (errorCode === "DOCTOR_NOT_FOUND" || errorCode === "PATIENT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: errorCode.replaceAll("_", " ").toLowerCase(),
      });
    }

    console.error("RECEPTIONIST RESCHEDULE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to reschedule appointment",
    });
  }
}
