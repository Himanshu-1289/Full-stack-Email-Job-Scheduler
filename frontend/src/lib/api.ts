import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
  withCredentials: true, // send the httpOnly session cookie
});

export async function loginWithGoogle(idToken: string) {
  const { data } = await api.post("/api/auth/google", { idToken });
  return data.user;
}

export async function logout() {
  await api.post("/api/auth/logout");
}

export async function fetchScheduledEmails() {
  const { data } = await api.get("/api/emails/scheduled");
  return data.emails;
}

export async function fetchSentEmails() {
  const { data } = await api.get("/api/emails/sent");
  return data.emails;
}

export async function fetchSenders() {
  const { data } = await api.get("/api/senders");
  return data.senders;
}

export async function parseLeadsFile(file: File) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post("/api/leads/parse", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data as { count: number; recipients: string[] };
}

export interface ScheduleCampaignInput {
  senderId: string;
  subject: string;
  body: string;
  recipients: string[];
  startTime: string;
  delayMs: number;
  hourlyLimit: number;
}

export async function scheduleCampaign(input: ScheduleCampaignInput) {
  const { data } = await api.post("/api/campaigns", input);
  return data.campaign;
}
