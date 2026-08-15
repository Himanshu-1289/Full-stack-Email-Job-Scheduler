"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "@/lib/AuthContext";
import { loginWithGoogle } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { user, setUser, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-brand-500 flex items-center justify-center text-white font-bold text-lg">
          RI
        </div>
        <h1 className="text-xl font-semibold mb-1">ReachInbox Scheduler</h1>
        <p className="text-sm text-gray-500 mb-6">
          Sign in to schedule and track your email campaigns.
        </p>

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={async (credentialResponse) => {
              if (!credentialResponse.credential) return;
              const user = await loginWithGoogle(credentialResponse.credential);
              setUser(user);
              router.push("/dashboard");
            }}
            onError={() => console.error("Google login failed")}
          />
        </div>
      </div>
    </main>
  );
}
