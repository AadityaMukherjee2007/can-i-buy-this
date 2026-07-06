"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function AuthNav() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 sm:px-6 py-3">
        <Link href={user ? "/app" : "/"} className="text-base font-semibold text-slate-900 tracking-tight">
          canibuythis
        </Link>
        {loading ? (
          <div className="h-8 w-20" />
        ) : user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 hidden sm:inline">{user.full_name}</span>
            <Link
              href="/settings"
              className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </Link>
            <button
              onClick={() => { logout(); router.push("/auth/login"); }}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/auth/register"
              className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
