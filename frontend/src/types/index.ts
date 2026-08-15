export type EmailStatus =
  | "PENDING"
  | "QUEUED"
  | "DELAYED"
  | "PROCESSING"
  | "SENT"
  | "FAILED";

export interface ScheduledEmail {
  id: string;
  recipient: string;
  subject: string;
  scheduledFor: string;
  sentAt: string | null;
  status: EmailStatus;
}

export interface Sender {
  id: string;
  label: string;
  maxPerHour: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}
