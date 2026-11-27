import "dotenv/config";
import { notificationWorker } from "./modules/notifications/notification.worker";

console.log("MediCare notification worker started");

async function shutdown() {
  await notificationWorker.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);