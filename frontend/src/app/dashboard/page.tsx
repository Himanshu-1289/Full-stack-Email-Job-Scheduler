"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import Header from "@/components/Header";
import Button from "@/components/ui/Button";
import EmailTable from "@/components/EmailTable";
import ComposeModal from "@/components/ComposeModal";
import { fetchScheduledEmails, fetchSentEmails } from "@/lib/api";
import { ScheduledEmail } from "@/types";

type Tab = "scheduled" | "sent";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("scheduled");
  const [scheduled, setScheduled] = useState<ScheduledEmail[]>([]);
  const [sent, setSent] = useState<ScheduledEmail[]>([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  const refresh = useCallback(async () => {
    setTableLoading(true);
    try {
      const [s, se] = await Promise.all([fetchScheduledEmails(), fetchSentEmails()]);
      setScheduled(s);
      setSent(se);
    } finally {
      setTableLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  // Poll every 10s so the dashboard reflects worker progress without a manual refresh.
  useEffect(() => {
    if (!user) return;
    const id = setInterval(refresh, 10000);
    return () => clearInterval(id);
  }, [user, refresh]);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
            {(["scheduled", "sent"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                  tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t === "scheduled" ? "Scheduled Emails" : "Sent Emails"}
              </button>
            ))}
          </div>

          <Button onClick={() => setComposeOpen(true)}>+ Compose New Email</Button>
        </div>

        {tab === "scheduled" ? (
          <EmailTable emails={scheduled} loading={tableLoading} mode="scheduled" />
        ) : (
          <EmailTable emails={sent} loading={tableLoading} mode="sent" />
        )}
      </main>

      <ComposeModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        onScheduled={refresh}
      />
    </div>
  );
}
