import { PrismaClient } from "@prisma/client";
import { createEtherealTestAccount } from "../src/services/mailer";
import { env } from "../src/config/env";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.sender.findFirst();
  if (existing) {
    console.log("Sender already exists, skipping seed:", existing.label);
    return;
  }

  const creds =
    env.etherealUser && env.etherealPass
      ? {
          smtpHost: "smtp.ethereal.email",
          smtpPort: 587,
          smtpUser: env.etherealUser,
          smtpPass: env.etherealPass,
        }
      : await createEtherealTestAccount();

  const sender = await prisma.sender.create({
    data: {
      label: "Default Ethereal Sender",
      smtpHost: creds.smtpHost,
      smtpPort: creds.smtpPort,
      smtpUser: creds.smtpUser,
      smtpPass: creds.smtpPass,
      maxPerHour: env.maxEmailsPerHour,
    },
  });

  console.log("Created sender:", sender.label, sender.smtpUser);
  console.log("Ethereal inbox preview: https://ethereal.email/login");
  console.log(`  user: ${sender.smtpUser}`);
  console.log(`  pass: ${sender.smtpPass}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
