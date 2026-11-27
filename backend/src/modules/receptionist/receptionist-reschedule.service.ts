
import { prisma } from "../../lib/prisma";
import { fromZonedTime } from "date-fns-tz";

const CLINIC_TIME_ZONE =
  process.env.CLINIC_TIME_ZONE || "Asia/Colombo";

interface RescheduleInput {
  appointmentId: number;
  startAt: Date;
  endAt: Date;
}

function getClinicDateTime(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CLINIC_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  };
}

export async function rescheduleSecureAppointment(
  input: RescheduleInput,
) {
  const { appointmentId, startAt, endAt } = input;

  if (
    Number.isNaN(startAt.getTime()) ||
    Number.isNaN(endAt.getTime()) ||
    endAt <= startAt
  ) {
    throw new Error("INVALID_APPOINTMENT_TIME");
  }

  if (startAt <= new Date()) {
    throw new Error("APPOINTMENT_MUST_BE_IN_FUTURE");
  }

  return prisma.$transaction(
    async (tx) => {
      const existing = await tx.appointment.findUnique({
        where: { id: appointmentId },
        select: {
          id: true,
          patientId: true,
          doctorId: true,
          status: true,
        },
      });

      if (!existing) {
        throw new Error("APPOINTMENT_NOT_FOUND");
      }

      if (!["PENDING", "CONFIRMED"].includes(existing.status)) {
        throw new Error("APPOINTMENT_CANNOT_BE_RESCHEDULED");
      }

      // Lock the doctor row. The booking service should use the
      // same lock to coordinate competing bookings.
      const lockedDoctors = await tx.$queryRaw<{ id: number }[]>`
        SELECT id
        FROM doctors
        WHERE id = ${existing.doctorId}
        FOR UPDATE
      `;

      if (lockedDoctors.length === 0) {
        throw new Error("DOCTOR_NOT_FOUND");
      }

      const doctor = await tx.doctor.findUnique({
        where: { id: existing.doctorId },
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
        where: { id: existing.patientId },
        select: { id: true },
      });

      if (!patient) {
        throw new Error("PATIENT_NOT_FOUND");
      }

      const startLocal = getClinicDateTime(startAt);
      const endLocal = getClinicDateTime(endAt);

      // Keep each appointment within one clinic-local calendar day.
      if (startLocal.date !== endLocal.date) {
        throw new Error("APPOINTMENT_MUST_BE_WITHIN_ONE_DAY");
      }

      const localDate = startLocal.date;
      const dateObject = new Date(`${localDate}T00:00:00Z`);
      const dayOfWeek = dateObject.getUTCDay();

      const leaveDate = fromZonedTime(
        `${localDate}T00:00:00`,
        CLINIC_TIME_ZONE,
      );

      const leave = await tx.doctorLeave.findUnique({
        where: {
          doctorId_leaveDate: {
            doctorId: existing.doctorId,
            leaveDate,
          },
        },
      });

      if (leave) {
        throw new Error("DOCTOR_ON_LEAVE");
      }

      const schedules = await tx.doctorSchedule.findMany({
        where: {
          doctorId: existing.doctorId,
          dayOfWeek,
          isAvailable: true,
        },
      });

      const withinSchedule = schedules.some((schedule) => {
        return (
          startLocal.time >= schedule.startTime &&
          endLocal.time <= schedule.endTime
        );
      });

      if (!withinSchedule) {
        throw new Error("OUTSIDE_DOCTOR_SCHEDULE");
      }

      // Check conflicts with other appointments for this doctor.
      const doctorConflict = await tx.appointment.findFirst({
        where: {
          id: { not: appointmentId },
          doctorId: existing.doctorId,
          status: { in: ["PENDING", "CONFIRMED"] },
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
        select: { id: true },
      });

      if (doctorConflict) {
        throw new Error("DOCTOR_SLOT_ALREADY_BOOKED");
      }

      // Check whether the patient has another overlapping appointment.
      const patientConflict = await tx.appointment.findFirst({
        where: {
          id: { not: appointmentId },
          patientId: existing.patientId,
          status: { in: ["PENDING", "CONFIRMED"] },
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
        select: { id: true },
      });

      if (patientConflict) {
        throw new Error("PATIENT_HAS_OVERLAPPING_APPOINTMENT");
      }

      // Conditional update prevents overwriting a cancellation
      // or status change made by another request.
      const updated = await tx.appointment.updateMany({
        where: {
          id: appointmentId,
          status: { in: ["PENDING", "CONFIRMED"] },
        },
        data: {
          startAt,
          endAt,
          status: "PENDING",
        },
      });

      if (updated.count !== 1) {
        throw new Error("APPOINTMENT_STATUS_CHANGED");
      }

      return tx.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          patient: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
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
      });
    },
    {
      isolationLevel: "Serializable",
      maxWait: 5000,
      timeout: 10000,
    },
  );
}
