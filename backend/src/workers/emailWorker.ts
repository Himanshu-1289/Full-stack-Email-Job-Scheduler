import { Worker, Job } from "bullmq";
import { redisConnection } from "../config/redis";
import { env } from "../config/env";
import { prisma } from "../db/prisma";
import { EmailStatus } from "@prisma/client";
import { EMAIL_QUEUE_NAME, EmailJobData, enqueueEmailJob } from "../queues/emailQueue";
import { sendMail } from "../services/mailer";
import { tryReserveSlot, nextWindowStart, rebuildFromDb } from "../services/rateLimiter";

/**
 * Simple in-process delay used to enforce the minimum gap between sends
 * regardless of BullMQ's own concurrency/limiter, giving us a second,
 * explicit line of defense that's easy to reason about and tune per-run
 * (see README "Throughput & rate limiting" for why we use both).
 */
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processJob(job: Job<EmailJobData>) {
  const { scheduledEmailId, senderId, recipient, subject, body } = job.data;

  const row = await prisma.scheduledEmail.findUnique({
    where: { id: scheduledEmailId },
    include: { sender: true },
  });

  // Idempotency guard: if this row is already SENT (e.g. the job was
  // retried after a crash that happened *after* the send but *before* we
  // marked it sent), don't send twice.
  if (!row || row.status === EmailStatus.SENT) {
    return { skipped: true };
  }

  await prisma.scheduledEmail.update({
    where: { id: scheduledEmailId },
    data: { status: EmailStatus.PROCESSING, attempts: { increment: 1 } },
  });

  const sender = row.sender;
  const maxPerHour = sender.maxPerHour || env.maxEmailsPerHour;

  // --- Rate limit check (Redis-backed, safe across concurrent workers) ---
  const reserved = await tryReserveSlot(senderId, maxPerHour);
  if (!reserved) {
    // Hourly cap hit: do NOT fail the job. Reschedule it into the next
    // hour window, preserving relative order via scheduledFor.
    const runAt = nextWindowStart(new Date());
    const jobId = await enqueueEmailJob(
      { scheduledEmailId, senderId, recipient, subject, body },
      runAt
    );
    await prisma.scheduledEmail.update({
      where: { id: scheduledEmailId },
      data: { status: EmailStatus.DELAYED, jobId, scheduledFor: runAt },
    });
    return { requeued: true, runAt };
  }

  // --- Minimum delay between sends (mimics provider throttling) ---
  await sleep(env.minDelayMsBetweenEmails);

  try {
    const result = await sendMail(
      {
        id: sender.id,
        smtpHost: sender.smtpHost,
        smtpPort: sender.smtpPort,
        smtpUser: sender.smtpUser,
        smtpPass: sender.smtpPass,
      },
      { to: recipient, subject, html: body }
    );

    await prisma.scheduledEmail.update({
      where: { id: scheduledEmailId },
      data: { status: EmailStatus.SENT, sentAt: new Date(), lastError: null },
    });

    return { sent: true, previewUrl: result.previewUrl };
  } catch (err: any) {
    await prisma.scheduledEmail.update({
      where: { id: scheduledEmailId },
      data: { status: EmailStatus.FAILED, lastError: String(err?.message || err) },
    });
    throw err; // let BullMQ's retry/backoff policy take over
  }
}

async function main() {
  // Rebuild rate-limit counters for the current hour in case Redis was
  // restarted/flushed independently of Postgres.
  await rebuildFromDb();

  const worker = new Worker<EmailJobData>(EMAIL_QUEUE_NAME, processJob, {
    connection: redisConnection,
    concurrency: env.workerConcurrency, // configurable worker concurrency
  });

  worker.on("completed", (job, result) => {
    console.log(`[worker] job ${job.id} done`, result);
  });
  worker.on("failed", (job, err) => {
    console.error(`[worker] job ${job?.id} failed:`, err.message);
  });

  console.log(
    `[worker] listening on "${EMAIL_QUEUE_NAME}" (concurrency=${env.workerConcurrency})`
  );
}

main().catch((err) => {
  console.error("Worker failed to start", err);
  process.exit(1);
});
