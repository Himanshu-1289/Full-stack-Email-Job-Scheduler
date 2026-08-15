import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { parseLeadsFile } from "../utils/parseLeads";
import { createCampaign } from "../services/schedulerService";
import { prisma } from "../db/prisma";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

/** POST /api/leads/parse — upload CSV/text, return detected recipient count + preview */
router.post("/leads/parse", requireAuth, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "file is required" });
  const recipients = parseLeadsFile(req.file.buffer);
  res.json({ count: recipients.length, recipients });
});

const scheduleSchema = z.object({
  senderId: z.string().uuid(),
  subject: z.string().min(1),
  body: z.string().min(1),
  recipients: z.array(z.string().email()).min(1),
  startTime: z.coerce.date(),
  delayMs: z.number().int().positive().default(2000),
  hourlyLimit: z.number().int().positive().default(200),
});

/** POST /api/campaigns — create + schedule a batch of emails */
router.post("/campaigns", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = scheduleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const campaign = await createCampaign({
    userId: req.user!.id,
    ...parsed.data,
  });

  res.status(201).json({ campaign });
});

/** GET /api/emails/scheduled — table of not-yet-sent emails */
router.get("/emails/scheduled", requireAuth, async (_req, res) => {
  const emails = await prisma.scheduledEmail.findMany({
    where: { status: { in: ["PENDING", "QUEUED", "DELAYED", "PROCESSING"] } },
    orderBy: { scheduledFor: "asc" },
    take: 200,
  });
  res.json({ emails });
});

/** GET /api/emails/sent — table of sent/failed emails */
router.get("/emails/sent", requireAuth, async (_req, res) => {
  const emails = await prisma.scheduledEmail.findMany({
    where: { status: { in: ["SENT", "FAILED"] } },
    orderBy: { sentAt: "desc" },
    take: 200,
  });
  res.json({ emails });
});

/** GET /api/senders — list configured sender mailboxes for the compose form */
router.get("/senders", requireAuth, async (_req, res) => {
  const senders = await prisma.sender.findMany({
    select: { id: true, label: true, maxPerHour: true },
  });
  res.json({ senders });
});

export default router;
