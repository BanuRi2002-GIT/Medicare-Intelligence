import { Worker } from "bullmq";
import { redisConnection } from "./notification.queue";
import { sendNotificationEmail } from "./email.service";

export const notificationWorker = new Worker(
  "medicare-notifications",
  async (job) => {
    if (job.name === "send-email") {
      const { email, subject, message } = job.data;

      await sendNotificationEmail(
        email,
        subject,
        message
      );

      return {
        success: true,
        recipient: email,
      };
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

notificationWorker.on("completed", (job) => {
  console.log(`Notification job ${job.id} completed`);
});

notificationWorker.on("failed", (job, error) => {
  console.error(
    `Notification job ${job?.id} failed:`,
    error.message
  );
});