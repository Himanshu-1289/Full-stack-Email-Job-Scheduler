import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import authRoutes from "./routes/authRoutes";
import campaignRoutes from "./routes/campaignRoutes";
import { recoverUnqueuedEmails } from "./services/schedulerService";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api", campaignRoutes);

async function bootstrap() {
  // Restart-safety: reconcile Postgres <-> Redis before accepting traffic.
  // Any ScheduledEmail row that isn't backed by a live BullMQ job gets
  // re-enqueued here, so "stop server -> start again" never loses a
  // future send and never restarts an already-queued one from scratch.
  const recovered = await recoverUnqueuedEmails();
  if (recovered > 0) {
    console.log(`[bootstrap] recovered ${recovered} unqueued email(s) after restart`);
  }

  app.listen(env.port, () => {
    console.log(`[api] listening on http://localhost:${env.port}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to bootstrap server", err);
  process.exit(1);
});
