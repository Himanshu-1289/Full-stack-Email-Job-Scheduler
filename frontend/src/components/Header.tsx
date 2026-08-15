"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { logout } from "@/lib/api";
import Button from "./ui/Button";

export default function Header() {
  const { user, setUser } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    setUser(null);
    router.replace("/");
  }

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold text-sm">
          RI
        </div>
        <span className="font-semibold text-gray-800">ReachInbox Scheduler</span>
      </div>

      {user && (
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-800">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="h-9 w-9 rounded-full" />
          ) : (
            <div className="h-9 w-9 rounded-full bg-gray-200" />
          )}
          <Button variant="ghost" onClick={handleLogout}>Logout</Button>
        </div>
      )}
    </header>
  );
}
