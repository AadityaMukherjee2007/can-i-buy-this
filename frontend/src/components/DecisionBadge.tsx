"use client";

import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { fmt } from "@/lib/format";

interface Props {
  decision: string;
  reason: string;
  minReserve: number;
  purchaseCost: number;
  chartData: number[];
  withoutPurchaseData: number[];
  onReset?: () => void;
  waitDays?: number | null;
  waitDate?: string | null;
  currency?: string;
}

const DECISIONS: Record<string, { label: string; border: string; bg: string; text: string; sub: string }> = {
  YES: { label: "Yes", border: "border-l-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", sub: "text-emerald-600" },
  NO: { border: "border-l-red-500", bg: "bg-red-50", text: "text-red-700", sub: "text-red-600", label: "No" },
  WAIT: { border: "border-l-amber-500", bg: "bg-amber-50", text: "text-amber-700", sub: "text-amber-600", label: "Wait" },
};

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function DecisionBadge({
  decision, reason, minReserve, purchaseCost, chartData, withoutPurchaseData, onReset, waitDays, waitDate, currency,
}: Props) {
  const c = DECISIONS[decision as keyof typeof DECISIONS] ?? DECISIONS.NO;

  const endBalance = chartData.length > 0 ? chartData[chartData.length - 1] : 0;
  const withoutEnd = withoutPurchaseData.length > 0 ? withoutPurchaseData[withoutPurchaseData.length - 1] : 0;
  const costImpact = withoutEnd - endBalance;

  const runwayDays = chartData.findIndex((v) => v < minReserve);
  const runway = runwayDays >= 0 ? runwayDays : 90;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`border-l-4 ${c.border} ${c.bg} rounded-r-lg p-4 sm:p-5`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className={`text-2xl sm:text-3xl font-bold tracking-tight ${c.text}`}>{c.label}</p>
          <p className={`mt-1 text-xs sm:text-sm ${c.sub}`}>{reason}</p>
          {decision === "WAIT" && waitDays != null && (
            <div className="mt-3 flex items-center gap-3">
              <div className="relative h-8 w-8 shrink-0">
                <svg className="h-8 w-8 -rotate-90" viewBox="0 0 32 32">
                  <circle cx="16" cy="16" r="13" fill="none" stroke="#fde68a" strokeWidth="3" />
                  <circle
                    cx="16" cy="16" r="13"
                    fill="none" stroke="#f59e0b" strokeWidth="3"
                    strokeDasharray={`${(waitDays / 90) * 81.68} 81.68`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-amber-700">
                  {waitDays}d
                </span>
              </div>
              <div>
                <p className="text-xs font-medium text-amber-700">Wait until {waitDate ? formatDate(waitDate) : `day ${waitDays}`}</p>
                <p className="text-[11px] text-amber-500">{90 - waitDays} days of runway remaining</p>
              </div>
            </div>
          )}
          {decision === "YES" && purchaseCost > 0 && (
            <p className="mt-2 text-xs text-emerald-600">
              Purchase cost of {fmt(purchaseCost, currency)} is within safe limits.
            </p>
          )}
          {decision === "NO" && runway < 90 && (
            <p className="mt-2 text-xs text-red-600">
              Cash reserve breached on day {runwayDays + 1} — {runwayDays < 30 ? "within the first month" : "within 90 days"}.
            </p>
          )}
        </div>
        {onReset && (
          <button
            onClick={onReset}
            className="shrink-0 rounded-lg p-2 text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-colors"
            aria-label="New evaluation"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
        <div className="rounded-md bg-white/80 px-2.5 py-2 sm:px-3 min-w-0">
          <p className="text-[11px] sm:text-xs text-slate-400 truncate">Purchase cost</p>
          <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">{fmt(purchaseCost, currency)}</p>
        </div>
        <div className="rounded-md bg-white/80 px-2.5 py-2 sm:px-3 min-w-0">
          <p className="text-[11px] sm:text-xs text-slate-400 truncate">Day 90 balance</p>
          <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">{fmt(endBalance, currency)}</p>
        </div>
        <div className="rounded-md bg-white/80 px-2.5 py-2 sm:px-3 min-w-0">
          <p className="text-[11px] sm:text-xs text-slate-400 truncate">Cash impact</p>
          <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">{fmt(costImpact, currency)}</p>
        </div>
        <div className="rounded-md bg-white/80 px-2.5 py-2 sm:px-3 min-w-0">
          <p className="text-[11px] sm:text-xs text-slate-400 truncate">Runway</p>
          <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">{runway >= 90 ? "90+ days" : `${runway} days`}</p>
        </div>
      </div>
    </motion.div>
  );
}
