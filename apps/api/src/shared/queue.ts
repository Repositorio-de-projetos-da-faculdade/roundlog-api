// src/shared/queue.ts
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const audioQueue = new Queue("audio-processing", { connection });
export const overdueQueue = new Queue("overdue-scan", { connection });

/**
 * Garante que existe um job repeatable scaneando condutas em atraso.
 * Idempotente — chamar várias vezes não cria duplicatas.
 */
export async function ensureOverdueScanScheduled(intervalMinutes = 5) {
  await overdueQueue.add(
    "overdue-scan",
    {},
    {
      repeat: { every: intervalMinutes * 60 * 1000 },
      removeOnComplete: { age: 3600, count: 100 },
      removeOnFail: { age: 24 * 3600 },
      jobId: "overdue-scan-recurring",
    },
  );
}

export { connection as redisConnection, Worker };
