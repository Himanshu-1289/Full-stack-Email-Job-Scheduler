import dotenv from "dotenv";
dotenv.config();

function required(name: string, fallback?: string): string {
  const val = process.env[name] ?? fallback;
  if (val === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return val;
}

export const env = {
  port: parseInt(process.env.PORT || "4000", 10),
  frontendUrl: required("FRONTEND_URL", "http://localhost:3000"),
  jwtSecret: required("JWT_SECRET", "dev-secret"),

  databaseUrl: required("DATABASE_URL"),

  redisHost: required("REDIS_HOST", "localhost"),
  redisPort: parseInt(process.env.REDIS_PORT || "6379", 10),
  redisPassword: process.env.REDIS_PASSWORD || undefined,

  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",

  etherealUser: process.env.ETHEREAL_USER || "",
  etherealPass: process.env.ETHEREAL_PASS || "",

  minDelayMsBetweenEmails: parseInt(
    process.env.MIN_DELAY_MS_BETWEEN_EMAILS || "2000",
    10
  ),
  maxEmailsPerHour: parseInt(process.env.MAX_EMAILS_PER_HOUR || "200", 10),

  workerConcurrency: parseInt(process.env.WORKER_CONCURRENCY || "5", 10),
};
