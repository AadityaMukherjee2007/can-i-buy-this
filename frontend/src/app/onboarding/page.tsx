"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Building2, ArrowRight, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { API } from "@/lib/format";

const STEP_KEY = "onboarding_step";

export default function OnboardingPage() {
  const router = useRouter();
  const { token, loading: authLoading } = useAuth();

  const [step, setStep] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STEP_KEY);
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });
  const [companyName, setCompanyName] = useState("");
  const [safeReserve, setSafeReserve] = useState("");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STEP_KEY, step.toString());
    }
  }, [step]);

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push("/auth/login"); return; }

    fetch(`${API}/api/business/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { company_name?: string; min_safe_reserve?: number } | null) => {
        if (data?.company_name) {
          router.push("/app");
        } else {
          setSafeReserve(data?.min_safe_reserve?.toString() ?? "5000");
          setBusy(false);
        }
      })
      .catch(() => setBusy(false));
  }, [token, authLoading, router]);

  const handleSubmit = async () => {
    setError(null);
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (companyName.trim()) body.company_name = companyName.trim();
      const reserve = parseFloat(safeReserve);
      if (!isNaN(reserve) && reserve >= 0) body.min_safe_reserve = reserve;

      const res = await fetch(`${API}/api/business/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => null);
        throw new Error(e?.detail || "Save failed");
      }
      localStorage.removeItem(STEP_KEY);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    localStorage.removeItem(STEP_KEY);
    router.push("/app");
  };

  if (authLoading || busy) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-base font-semibold text-slate-900 tracking-tight">canibuythis</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          {[0, 1, 2].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s <= step ? "w-8 bg-slate-900" : "w-1.5 bg-slate-200"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
            >
              <div className="rounded-lg border border-slate-200 bg-white p-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="rounded-full bg-slate-100 p-3">
                    <Building2 className="h-6 w-6 text-slate-600" />
                  </div>
                </div>
                <h1 className="text-base font-semibold text-slate-900 text-center">Welcome to canibuythis</h1>
                <p className="text-sm text-slate-500 text-center mt-1 mb-6">
                  Set up your business to start evaluating purchases against your cash flow.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
                  >
                    Get started
                  </button>
                  <button
                    onClick={handleSkip}
                    className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Skip for now
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
            >
              <div className="rounded-lg border border-slate-200 bg-white p-6">
                <h1 className="text-base font-semibold text-slate-900">Your business</h1>
                <p className="text-sm text-slate-500 mb-5">Tell us about your company so we can tailor projections.</p>
                <div className="space-y-5">
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
                    <p className="mt-1 text-xs text-slate-400">
                      The minimum balance your business should maintain before making purchases.
                    </p>
                  </div>
                  {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={handleSubmit}
                      disabled={saving}
                      className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {saving ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving
                        </span>
                      ) : (
                        "Continue"
                      )}
                    </button>
                    <button
                      onClick={handleSkip}
                      className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      Skip for now
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
            >
              <div className="rounded-lg border border-slate-200 bg-white p-6 text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="rounded-full bg-emerald-50 p-3">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
                <h1 className="text-base font-semibold text-slate-900">You&apos;re all set</h1>
                <p className="text-sm text-slate-500 mt-1 mb-6">
                  Your business is configured. Start evaluating purchases against your cash flow.
                </p>
                <button
                  onClick={() => router.push("/app")}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
                >
                  Go to dashboard
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
