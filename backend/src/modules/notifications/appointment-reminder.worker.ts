
import "dotenv/config";
import { Worker } from "bullmq";
import IORedis from "ioredis";

import { prisma } from "../../lib/prisma";
import { createNotification } from "./notification.service";
import { scheduleAppointmentReminder } from "./appointment-reminder.service";
import { APPOINTMENT_REMINDER_QUEUE } from "./appointment-reminder.queue";

const connection = new IORedis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT || 6379),
  maxRetriesPerRequest: null,
});

export const appointmentReminderWorker = new Worker(
  APPOINTMENT_REMINDER_QUEUE,
  async (job) => {
    if (job.name !== "send-appointment-reminder") {
      return;
    }

    const { appointmentId, scheduledStartAt } = job.data as {
      appointmentId: number;
      scheduledStartAt: string;
    };

    console.log(
      `Processing appointment reminder for ID: ${appointmentId}`
    );

    // Get the latest appointment information.
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

    // Appointment might have been deleted.
    if (!appointment) {
      console.log(`Appointment ${appointmentId} not found.`);
      return;
    }

    // Do not send reminders for cancelled or unconfirmed appointments.
    if (appointment.status !== "CONFIRMED") {
      console.log(
        `Reminder skipped: appointment ${appointmentId} is not confirmed.`
      );
      return;
    }

    // Do not send a reminder if the appointment has already started.
    if (Date.now() >= appointment.startAt.getTime()) {
      console.log(
        `Reminder skipped: appointment ${appointmentId} has already started.`
      );
      return;
    }

    // Check whether the appointment was rescheduled.
    const currentStartAt = appointment.startAt.getTime();
    const scheduledStartTime = new Date(scheduledStartAt).getTime();

    if (currentStartAt !== scheduledStartTime) {
      console.log(
        `Appointment ${appointmentId} was rescheduled. Checking its new reminder time.`
      );

      await scheduleAppointmentReminder(
        appointment.id,
        appointment.startAt
      );

      return;
    }

    // Create an in-app notification and queue its email.
    await createNotification({
      userId: appointment.patient.user.id,
      email: appointment.patient.user.email,
      title: "Appointment Reminder",
      message: `Reminder: You have an appointment scheduled for ${appointment.startAt.toLocaleString()}.`,
      type: "APPOINTMENT_REMINDER",
    });

    console.log(
      `Appointment reminder successfully processed for ID: ${appointmentId}`
    );
  },
  {
    connection,
    concurrency: 5,
  }
);

appointmentReminderWorker.on("completed", (job) => {
  console.log(`Reminder job ${job.id} completed.`);
});

appointmentReminderWorker.on("failed", (job, error) => {
  console.error(
    `Reminder job ${job?.id} failed:`,
    error.message
  );
});

appointmentReminderWorker.on("error", (error) => {
  console.error("Appointment reminder worker error:", error);
});

console.log("Appointment reminder worker is running.");

async function shutdown() {
  console.log("Shutting down appointment reminder worker...");

  await appointmentReminderWorker.close();
  await connection.quit();

  console.log("Appointment reminder worker stopped.");

  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
