import { prisma } from "../../lib/prisma";
import { notificationQueue } from "./notification.queue";

interface CreateNotificationInput {
  userId: number;
  title: string;
  message: string;
  type:
    | "APPOINTMENT_BOOKED"
    | "APPOINTMENT_CONFIRMED"
    | "APPOINTMENT_CANCELLED"
    | "APPOINTMENT_RESCHEDULED"
    | "APPOINTMENT_REMINDER"
    | "GENERAL";
  email: string;
}

export async function createNotification(
  input: CreateNotificationInput
) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type,
    },
  });

  try {
    await notificationQueue.add(
      "send-email",
      {
        email: input.email,
        subject: input.title,
        message: input.message,
      },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      }
    );
  } catch (error) {
    console.error("EMAIL QUEUE ERROR:", error);
  }

  return notification;
}