import { prisma } from "../db/prisma";
import { enqueueEmailJob } from "../queues/emailQueue";
import { EmailStatus } from "@prisma/client";

export interface CreateCampaignInput {
  userId: string;
  senderId: string;
  subject: string;
  body: string;
  recipients: string[];
  startTime: Date;
  delayMs: number;
  hourlyLimit: number;
}

/**
 * Create a campaign + one ScheduledEmail row per recipient, spaced apart
 * by `delayMs` starting at `startTime`, then enqueue each as a delayed
 * BullMQ job. The DB write happens BEFORE the enqueue, and the enqueue
 * uses jobId = row.id, so if this process crashes mid-loop, re-running
 * `recoverUnqueuedEmails()` (called on boot) will pick up any row that
 * has no jobId yet without ever double-sending an already-queued one.
 */
export async function createCampaign(input: CreateCampaignInput) {
  const campaign = await prisma.campaign.create({
    data: {
      userId: input.userId,
      subject: input.subject,
      body: input.body,
      delayMs: input.delayMs,
      hourlyLimit: input.hourlyLimit,
      startTime: input.startTime,
    },
  });

  const rows = await prisma.$transaction(
    input.recipients.map((recipient, i) =>
      prisma.scheduledEmail.create({
        data: {
          campaignId: campaign.id,
          senderId: input.senderId,
          recipient,
          subject: input.subject,
          body: input.body,
          scheduledFor: new Date(
            input.startTime.getTime() + i * input.delayMs
          ),
          status: EmailStatus.PENDING,
        },
      })
    )
  );

  for (const row of rows) {
    const jobId = await enqueueEmailJob(
      {
        scheduledEmailId: row.id,
        senderId: row.senderId,
        recipient: row.recipient,
        subject: row.subject,
        body: row.body,
      },
      row.scheduledFor
    );
    await prisma.scheduledEmail.update({
      where: { id: row.id },
      data: { status: EmailStatus.QUEUED, jobId },
    });
  }

  return campaign;
}

/**
 * Boot-time recovery. Handles two restart scenarios:
 *  1. A row was written to Postgres but the process died before the
 *     matching BullMQ job was created (jobId still null) -> re-enqueue it.
 *  2. Redis itself was wiped (fresh volume / dev reset) while Postgres
 *     rows say QUEUED -> BullMQ has no memory of them either, so we detect
 *     "QUEUED but job missing from the queue" and re-enqueue.
 * Because enqueueEmailJob always uses jobId = scheduledEmailId, calling
 * this on a healthy boot (jobs already present in Redis) is a safe no-op.
 */
export async function recoverUnqueuedEmails() {
  const { emailQueue } = await import("../queues/emailQueue");

  const candidates = await prisma.scheduledEmail.findMany({
    where: {
      status: { in: [EmailStatus.PENDING, EmailStatus.QUEUED, EmailStatus.DELAYED] },
    },
  });

  let recovered = 0;
  for (const row of candidates) {
    const existingJob = row.jobId ? await emailQueue.getJob(row.jobId) : null;
    if (existingJob) continue; // already safely scheduled in Redis

    const runAt = row.scheduledFor < new Date() ? new Date() : row.scheduledFor;
    const jobId = await enqueueEmailJob(
      {
        scheduledEmailId: row.id,
        senderId: row.senderId,
        recipient: row.recipient,
        subject: row.subject,
        body: row.body,
      },
      runAt
    );
    await prisma.scheduledEmail.update({
      where: { id: row.id },
      data: { status: EmailStatus.QUEUED, jobId },
    });
    recovered++;
  }

  return recovered;
}
