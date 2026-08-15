import { redisConnection } from "../config/redis";
import { prisma } from "../db/prisma";

/**
 * Hourly rate limiting, enforced per-sender, safe under concurrent workers.
 *
 * Strategy: fixed hour-window bucketing (UTC), keyed as
 *   ratelimit:<senderId>:<YYYY-MM-DDTHH>
 * Each successful "reserve" does a Redis INCR (atomic) on that key and sets
 * a 2-hour TTL so keys self-clean. Because INCR is atomic, two workers
 * racing to send at the same instant can never both believe they're under
 * the limit when they're not — Redis is the single source of truth for the
 * hot path.
 *
 * Durability: every INCR is mirrored into the RateWindow Postgres table
 * (upsert), so if Redis is ever flushed/restarted, `rebuildFromDb()` can
 * restore today's counters before the worker starts processing again.
 * Trade-off: the DB mirror is best-effort/async and not itself part of the
 * atomic decision — Redis INCR is. This favors throughput over perfect
 * exactly-once accounting on the rare Redis-data-loss case, which is an
 * acceptable trade-off for a rate limiter (vs. the send itself, which is
 * kept exactly-once via the jobId idempotency key).
 */

function windowKeyFor(date: Date): string {
  // UTC hour bucket, e.g. "2026-08-15T10"
  return date.toISOString().slice(0, 13);
}

function redisKey(senderId: string, windowKey: string): string {
  return `ratelimit:${senderId}:${windowKey}`;
}

export function nextWindowStart(date: Date): Date {
  const next = new Date(date);
  next.setUTCMinutes(0, 0, 0);
  next.setUTCHours(next.getUTCHours() + 1);
  return next;
}

/**
 * Attempt to reserve one "send slot" for `senderId` in the hour window
 * containing `at`. Returns true if under the limit (and increments the
 * counter), false if the window is full (counter is NOT incremented).
 */
export async function tryReserveSlot(
  senderId: string,
  maxPerHour: number,
  at: Date = new Date()
): Promise<boolean> {
  const windowKey = windowKeyFor(at);
  const key = redisKey(senderId, windowKey);

  const count = await redisConnection.incr(key);
  if (count === 1) {
    await redisConnection.expire(key, 2 * 60 * 60); // 2h TTL, self-cleaning
  }

  if (count > maxPerHour) {
    // Over the limit — roll back our increment so we don't permanently
    // waste a slot, then report failure.
    await redisConnection.decr(key);
    return false;
  }

  // Mirror to Postgres for durability (fire-and-forget is fine here; the
  // authoritative decision already happened in Redis above).
  await prisma.rateWindow.upsert({
    where: { senderId_windowKey: { senderId, windowKey } },
    update: { count: { increment: 1 } },
    create: { senderId, windowKey, count: 1 },
  });

  return true;
}

/** Roll back a reservation, e.g. if the send ultimately fails before dispatch. */
export async function releaseSlot(
  senderId: string,
  at: Date = new Date()
): Promise<void> {
  const windowKey = windowKeyFor(at);
  const key = redisKey(senderId, windowKey);
  await redisConnection.decr(key);
  await prisma.rateWindow
    .update({
      where: { senderId_windowKey: { senderId, windowKey } },
      data: { count: { decrement: 1 } },
    })
    .catch(() => void 0); // ignore if row doesn't exist
}

/**
 * Rebuild Redis counters from the Postgres mirror for the current UTC hour.
 * Call this once on worker boot so a Redis restart/flush never silently
 * resets the hourly limit mid-window.
 */
export async function rebuildFromDb(now: Date = new Date()): Promise<void> {
  const windowKey = windowKeyFor(now);
  const rows = await prisma.rateWindow.findMany({ where: { windowKey } });
  const pipeline = redisConnection.pipeline();
  for (const row of rows) {
    const key = redisKey(row.senderId, windowKey);
    pipeline.set(key, row.count, "EX", 2 * 60 * 60);
  }
  await pipeline.exec();
}
