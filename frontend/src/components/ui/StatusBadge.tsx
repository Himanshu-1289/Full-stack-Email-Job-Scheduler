import { EmailStatus } from "@/types";

const styles: Record<EmailStatus, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  QUEUED: "bg-blue-100 text-blue-700",
  DELAYED: "bg-amber-100 text-amber-700",
  PROCESSING: "bg-indigo-100 text-indigo-700",
  SENT: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
};

export default function StatusBadge({ status }: { status: EmailStatus }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status.toLowerCase()}
    </span>
  );
}
