
import { appointmentReminderQueue } from "./appointment-reminder.queue";

export async function scheduleAppointmentReminder(
  appointmentId: number,
  appointmentStartAt: Date
) {
  // Send the reminder 24 hours before the appointment.
  const reminderTime =
    appointmentStartAt.getTime() - 24 * 60 * 60 * 1000;

  const delay = reminderTime - Date.now();

  // Do not schedule if the reminder time has already passed.
  if (delay <= 0) {
    console.log(
      `Reminder not scheduled for appointment ${appointmentId}: 24-hour reminder time has passed.`
    );
    return;
  }

  // Include appointment time in the ID so rescheduled
  // appointments can have a new reminder job.
  const jobId = `appointment-reminder-${appointmentId}-${appointmentStartAt.getTime()}`;

  await appointmentReminderQueue.add(
    "send-appointment-reminder",
    {
      appointmentId,
      scheduledStartAt: appointmentStartAt.toISOString(),
    },
    {
      delay,
      jobId,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    }
  );

  console.log(
    `Appointment reminder scheduled: ${appointmentId}`
  );
}
