import { prisma } from "../../lib/prisma";
import { fromZonedTime } from "date-fns-tz";

const CLINIC_TIME_ZONE =
  process.env.CLINIC_TIME_ZONE || "Asia/Colombo";

interface BookingInput {
  patientId: number;
  doctorId: number;
  startAt: Date;
  endAt: Date;
  reason?: string;
}

export async function createSecureAppointment(
  input: BookingInput
) {
  if (
    !Number.isFinite(input.startAt.getTime()) ||
    !Number.isFinite(input.endAt.getTime()) ||
    input.endAt <= input.startAt
  ) {
    throw new Error("INVALID_APPOINTMENT_TIME");
  }

  if (input.startAt <= new Date()) {
    throw new Error("APPOINTMENT_MUST_BE_IN_FUTURE");
  }

  return prisma.$transaction(
    async (tx) => {
      // Lock the doctor row to serialize bookings for this doctor.
      const lockedDoctors = await tx.$queryRaw<
        { id: number }[]
      >`
        SELECT id
        FROM doctors
        WHERE id = ${input.doctorId}
        FOR UPDATE
      `;

      if (lockedDoctors.length === 0) {
        throw new Error("DOCTOR_NOT_FOUND");
      }

      const doctor = await tx.doctor.findUnique({
        where: { id: input.doctorId },
        include: {
          user: {
            select: { status: true },
          },
        },
      });

      if (!doctor || doctor.user.status !== "ACTIVE") {
        throw new Error("DOCTOR_NOT_AVAILABLE");
      }

      const patient = await tx.patient.findUnique({
        where: { id: input.patientId },
      });

      if (!patient) {
        throw new Error("PATIENT_NOT_FOUND");
      }

      // Determine the requested date in the clinic timezone.
      const dateParts = new Intl.DateTimeFormat("en-CA", {
        timeZone: CLINIC_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(input.startAt);

      const dayStart = fromZonedTime(
        `${dateParts}T00:00:00`,
        CLINIC_TIME_ZONE
      );

      const date = new Date(`${dateParts}T00:00:00.000Z`);
      date.setUTCDate(date.getUTCDate() + 1);

      const nextDate = date.toISOString().slice(0, 10);

      const dayEnd = fromZonedTime(
        `${nextDate}T00:00:00`,
        CLINIC_TIME_ZONE
      );

      // Reject appointments that cross the clinic's calendar day.
      if (
        input.startAt < dayStart ||
        input.endAt > dayEnd
      ) {
        throw new Error("INVALID_APPOINTMENT_DATE");
      }

      const leave = await tx.doctorLeave.findUnique({
        where: {
          doctorId_leaveDate: {
            doctorId: input.doctorId,
            leaveDate: new Date(`${dateParts}T00:00:00.000Z`),
          },
        },
      });

      if (leave) {
        throw new Error("DOCTOR_ON_LEAVE");
      }

      const dayOfWeek = new Date(
        `${dateParts}T00:00:00.000Z`
      ).getUTCDay();

      const schedules = await tx.doctorSchedule.findMany({
        where: {
          doctorId: input.doctorId,
          dayOfWeek,
          isAvailable: true,
        },
      });

      const timeFormatter = new Intl.DateTimeFormat("en-GB", {
        timeZone: CLINIC_TIME_ZONE,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      });

      const requestedStart = timeFormatter.format(input.startAt);
      const requestedEnd = timeFormatter.format(input.endAt);

      const insideSchedule = schedules.some(
        (schedule) =>
          requestedStart >= schedule.startTime &&
          requestedEnd <= schedule.endTime
      );

      if (!insideSchedule) {
        throw new Error("OUTSIDE_DOCTOR_SCHEDULE");
      }

      const existingDoctorBooking = await tx.appointment.findFirst({
        where: {
          doctorId: input.doctorId,
          status: {
            in: ["PENDING", "CONFIRMED"],
          },
          startAt: { lt: input.endAt },
          endAt: { gt: input.startAt },
        },
      });

      if (existingDoctorBooking) {
        throw new Error("DOCTOR_SLOT_ALREADY_BOOKED");
      }

      const existingPatientBooking = await tx.appointment.findFirst({
        where: {
          patientId: input.patientId,
          status: {
            in: ["PENDING", "CONFIRMED"],
          },
          startAt: { lt: input.endAt },
          endAt: { gt: input.startAt },
        },
      });

      if (existingPatientBooking) {
        throw new Error("PATIENT_HAS_OVERLAPPING_APPOINTMENT");
      }

      return tx.appointment.create({
        data: {
          patientId: input.patientId,
          doctorId: input.doctorId,
          startAt: input.startAt,
          endAt: input.endAt,
          reason: input.reason,
          status: "PENDING",
        },
      });
    },
    {
      isolationLevel: "Serializable",
      maxWait: 5000,
      timeout: 10000,
    }
  );
}