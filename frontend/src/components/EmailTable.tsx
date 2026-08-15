"use client";

import { ScheduledEmail } from "@/types";
import StatusBadge from "./ui/StatusBadge";
import { format } from "date-fns";

interface Props {
  emails: ScheduledEmail[];
  loading: boolean;
  mode: "scheduled" | "sent";
}

export default function EmailTable({ emails, loading, mode }: Props) {
  const timeLabel = mode === "scheduled" ? "Scheduled time" : "Sent time";

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8">
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 rounded bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
        <p className="text-sm font-medium text-gray-700">
          {mode === "scheduled" ? "No scheduled emails yet" : "No emails sent yet"}
        </p>
        <p className="mt-1 text-sm text-gray-400">
          {mode === "scheduled"
            ? "Compose a new email to get started."
            : "Sent emails will show up here once your campaigns run."}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Subject</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">{timeLabel}</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {emails.map((e) => (
            <tr key={e.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-800">{e.recipient}</td>
              <td className="px-4 py-3 text-gray-600">{e.subject}</td>
              <td className="px-4 py-3 text-gray-500">
                {mode === "scheduled"
                  ? format(new Date(e.scheduledFor), "MMM d, HH:mm")
                  : e.sentAt
                  ? format(new Date(e.sentAt), "MMM d, HH:mm")
                  : "—"}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={e.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
