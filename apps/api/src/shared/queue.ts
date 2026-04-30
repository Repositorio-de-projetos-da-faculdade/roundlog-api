// src/shared/queue.ts
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const audioQueue = new Queue("audio-processing", { connection });

export { connection as redisConnection, Worker };
