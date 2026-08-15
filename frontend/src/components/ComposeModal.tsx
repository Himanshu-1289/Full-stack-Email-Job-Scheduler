"use client";

import { useEffect, useState } from "react";
import Button from "./ui/Button";
import { Sender } from "@/types";
import { fetchSenders, parseLeadsFile, scheduleCampaign } from "@/lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onScheduled: () => void;
}

export default function ComposeModal({ open, onClose, onScheduled }: Props) {
  const [senders, setSenders] = useState<Sender[]>([]);
  const [senderId, setSenderId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [delayMs, setDelayMs] = useState(2000);
  const [hourlyLimit, setHourlyLimit] = useState(200);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) fetchSenders().then(setSenders).catch(() => setSenders([]));
  }, [open]);

  if (!open) return null;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      const { recipients } = await parseLeadsFile(file);
      setRecipients(recipients);
    } catch {
      setError("Could not parse that file. Try a CSV or plain text list of emails.");
    }
  }

  async function handleSubmit() {
    setError("");
    if (!senderId) return setError("Select a sender.");
    if (!subject || !body) return setError("Subject and body are required.");
    if (recipients.length === 0) return setError("Upload a lead file with at least one valid email.");
    if (!startTime) return setError("Pick a start time.");

    setSubmitting(true);
    try {
      await scheduleCampaign({
        senderId,
        subject,
        body,
        recipients,
        startTime: new Date(startTime).toISOString(),
        delayMs,
        hourlyLimit,
      });
      onScheduled();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error?.toString?.() || "Failed to schedule campaign.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Compose new email</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Sender</label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={senderId}
              onChange={(e) => setSenderId(e.target.value)}
            >
              <option value="">Select sender…</option>
              {senders.map((s) => (
                <option key={s.id} value={s.id}>{s.label} (max {s.maxPerHour}/hr)</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Subject</label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Quick question about..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Body</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hi {{name}}, ..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Leads (CSV or text file)</label>
            <input type="file" accept=".csv,.txt" onChange={handleFile} className="text-sm" />
            {fileName && (
              <p className="mt-1 text-xs text-gray-500">
                {fileName} — <span className="font-medium text-gray-700">{recipients.length}</span> valid email(s) detected
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Start time</label>
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Delay between emails (ms)</label>
              <input
                type="number"
                min={0}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={delayMs}
                onChange={(e) => setDelayMs(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Hourly limit (per sender)</label>
            <input
              type="number"
              min={1}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(Number(e.target.value))}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Scheduling…" : "Schedule"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
