
import type { Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import type { AuthenticatedRequest } from "../../middlewares/auth.types";
import { consultationSchema } from "./consultation.validation";

export async function completeConsultation(
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

    if (!Number.isInteger(appointmentId) || appointmentId < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID",
      });
    }

    const validation = consultationSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid consultation details",
        errors: z.treeifyError(validation.error),
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

    const result = await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findFirst({
        where: {
          id: appointmentId,
          doctorId: doctor.id,
        },
        select: {
          id: true,
          patientId: true,
          doctorId: true,
          status: true,
        },
      });

      if (!appointment) {
        throw new Error("APPOINTMENT_NOT_FOUND");
      }

      if (appointment.status !== "CONFIRMED") {
        throw new Error("APPOINTMENT_NOT_CONFIRMED");
      }

      // Change the status conditionally to prevent duplicate completion.
      const updated = await tx.appointment.updateMany({
        where: {
          id: appointmentId,
          doctorId: doctor.id,
          status: "CONFIRMED",
        },
        data: {
          status: "COMPLETED",
        },
      });

      if (updated.count !== 1) {
        throw new Error("APPOINTMENT_STATUS_CHANGED");
      }

      const existingRecord = await tx.medicalRecord.findFirst({
        where: {
          appointmentId,
        },
        select: { id: true },
      });

      if (existingRecord) {
        throw new Error("CONSULTATION_RECORD_ALREADY_EXISTS");
      }

      const medicalRecord = await tx.medicalRecord.create({
        data: {
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          appointmentId: appointment.id,
          recordType: "CONSULTATION",
          title: validation.data.title,
          description: validation.data.description,
          clinicalNotes: validation.data.clinicalNotes,
        },
        select: {
          id: true,
          patientId: true,
          doctorId: true,
          appointmentId: true,
          recordType: true,
          title: true,
          description: true,
          clinicalNotes: true,
          createdAt: true,
        },
      });

      return medicalRecord;
    });

    return res.status(201).json({
      success: true,
      message: "Consultation completed and medical record saved",
      medicalRecord: result,
      appointmentStatus: "COMPLETED",
    });
  } catch (error) {
    console.error("COMPLETE CONSULTATION ERROR:", error);

    const errorMessages: Record<string, { status: number; message: string }> = {
      APPOINTMENT_NOT_FOUND: {
        status: 404,
        message: "Appointment not found for this doctor",
      },
      APPOINTMENT_NOT_CONFIRMED: {
        status: 409,
        message: "Only confirmed appointments can be completed",
      },
      APPOINTMENT_STATUS_CHANGED: {
        status: 409,
        message: "Appointment status changed. Refresh and try again",
      },
      CONSULTATION_RECORD_ALREADY_EXISTS: {
        status: 409,
        message: "A consultation record already exists for this appointment",
      },
    };

    if (error instanceof Error && errorMessages[error.message]) {
      const knownError = errorMessages[error.message];

      return res.status(knownError.status).json({
        success: false,
        message: knownError.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to complete consultation",
    });
  }
}
