import IORedis from "ioredis";
import { Queue } from "bullmq";

export const redisConnection = new IORedis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT || 6379),
  maxRetriesPerRequest: null,
});

export const notificationQueue = new Queue(
  "medicare-notifications",
  {
    connection: redisConnection,
  }
);