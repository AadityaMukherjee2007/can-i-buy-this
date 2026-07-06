"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { API } from "@/lib/format";

interface BusinessData {
  company_name: string;
  min_safe_reserve: number;
}

export default function SettingsPage() {
  const router = useRouter();
  const { token, loading: authLoading } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [safeReserve, setSafeReserve] = useState("");
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push("/auth/login"); return; }

    fetch(`${API}/api/business/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load business data");
        return res.json();
      })
      .then((data: BusinessData) => {
        setCompanyName(data.company_name || "");
        setSafeReserve(data.min_safe_reserve?.toString() || "");
      })
      .catch((err) => setError(err.message))
      .finally(() => setFetching(false));
  }, [token, authLoading, router]);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const body: Record<string, unknown> = {};
      if (companyName.trim()) body.company_name = companyName.trim();
      const reserve = parseFloat(safeReserve);
      if (!isNaN(reserve) && reserve >= 0) body.min_safe_reserve = reserve;

      const res = await fetch(`${API}/api/business/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const bodyErr = await res.json().catch(() => null);
        throw new Error(bodyErr?.detail || `Save failed (${res.status})`);
      }

      setSuccess("Settings saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-lg px-4 sm:px-6 py-8 sm:py-10">
        <h1 className="text-lg font-semibold text-slate-900 mb-1">Settings</h1>
        <p className="text-sm text-slate-500 mb-6">Business profile and financial thresholds.</p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="rounded-lg border border-slate-200 bg-white p-5"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="companyName" className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">
                Company name
              </label>
              <input
                id="companyName"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 hover:border-slate-300 focus:border-slate-400 focus:outline-none transition-colors"
                placeholder="Your company name"
              />
            </div>

            <div>
              <label htmlFor="safeReserve" className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">
                Minimum safe reserve
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">$</span>
                <input
                  id="safeReserve"
                  type="number"
                  step="0.01"
                  min="0"
                  value={safeReserve}
                  onChange={(e) => setSafeReserve(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 pl-7 pr-3 py-2 text-sm text-slate-900 placeholder-slate-400 hover:border-slate-300 focus:border-slate-400 focus:outline-none transition-colors"
                  placeholder="0.00"
                />
              </div>
              <p className="mt-1 text-xs text-slate-400">The minimum balance your business should maintain before making purchases.</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="alert">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving
                </span>
              ) : (
                "Save settings"
              )}
            </button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
