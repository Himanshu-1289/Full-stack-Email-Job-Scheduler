import nodemailer, { Transporter } from "nodemailer";

// One transporter per sender, cached by senderId so we reuse the SMTP
// connection pool instead of reconnecting for every email.
const transporterCache = new Map<string, Transporter>();

export interface SenderCreds {
  id: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
}

export function getTransporter(sender: SenderCreds): Transporter {
  const cached = transporterCache.get(sender.id);
  if (cached) return cached;

  const transporter = nodemailer.createTransport({
    host: sender.smtpHost,
    port: sender.smtpPort,
    secure: false, // Ethereal uses STARTTLS on 587
    auth: { user: sender.smtpUser, pass: sender.smtpPass },
  });

  transporterCache.set(sender.id, transporter);
  return transporter;
}

export async function sendMail(
  sender: SenderCreds,
  opts: { to: string; subject: string; html: string }
): Promise<{ messageId: string; previewUrl: string | false }> {
  const transporter = getTransporter(sender);
  const info = await transporter.sendMail({
    from: `"ReachInbox" <${sender.smtpUser}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });

  return {
    messageId: info.messageId,
    previewUrl: nodemailer.getTestMessageUrl(info),
  };
}

/** Dev convenience: create a throwaway Ethereal test account on the fly. */
export async function createEtherealTestAccount() {
  const account = await nodemailer.createTestAccount();
  return {
    smtpHost: account.smtp.host,
    smtpPort: account.smtp.port,
    smtpUser: account.user,
    smtpPass: account.pass,
  };
}
