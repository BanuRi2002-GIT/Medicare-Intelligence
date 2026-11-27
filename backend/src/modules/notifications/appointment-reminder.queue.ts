
import "dotenv/config";
import { Queue } from "bullmq";
import IORedis from "ioredis";

export const APPOINTMENT_REMINDER_QUEUE =
  "medicare-appointment-reminders";

export const appointmentReminderRedis = new IORedis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT || 6379),
  maxRetriesPerRequest: null,
});

export const appointmentReminderQueue = new Queue(
  APPOINTMENT_REMINDER_QUEUE,
  {
    connection: appointmentReminderRedis,
  }
);
