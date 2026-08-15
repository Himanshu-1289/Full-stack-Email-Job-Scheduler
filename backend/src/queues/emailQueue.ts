import { Queue } from "bullmq";
import { redisConnection } from "../config/redis";

export const EMAIL_QUEUE_NAME = "email-send-queue";

export interface EmailJobData {
  scheduledEmailId: string; // DB row id — used to re-fetch fresh state in worker
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
}

// A single shared Queue instance. Delayed jobs (jobId + delay) are how we
// implement "schedule at a specific time" without cron: BullMQ persists the
// job (with its target timestamp) in Redis, and Redis itself is backed by
// AOF/RDB persistence (see docker-compose), so a server restart does not
// lose or reset the schedule.
export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { age: 3600 * 24 * 7 }, // keep 7 days for dashboard/debug
    removeOnFail: false,
  },
});

/**
 * Enqueue (or re-enqueue) an email as a delayed BullMQ job.
 *
 * Idempotency: we always pass jobId = scheduledEmailId. BullMQ guarantees
 * that adding a job with a jobId that already exists in the queue is a
 * no-op (it returns the existing job instead of creating a duplicate), so
 * calling this twice for the same DB row can never create two sends.
 */
export async function enqueueEmailJob(
  data: EmailJobData,
  runAt: Date
): Promise<string> {
  const delay = Math.max(0, runAt.getTime() - Date.now());
  const job = await emailQueue.add(EMAIL_QUEUE_NAME, data, {
    jobId: data.scheduledEmailId,
    delay,
  });
  return job.id as string;
}
