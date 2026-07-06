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
}

const DECISIONS: Record<string, { label: string; border: string; bg: string; text: string; sub: string }> = {
  YES: { label: "Yes", border: "border-l-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", sub: "text-emerald-600" },
  NO: { border: "border-l-red-500", bg: "bg-red-50", text: "text-red-700", sub: "text-red-600", label: "No" },
  WAIT: { border: "border-l-amber-500", bg: "bg-amber-50", text: "text-amber-700", sub: "text-amber-600", label: "Wait" },
};

export default function DecisionBadge({
  decision, reason, minReserve, purchaseCost, chartData, withoutPurchaseData, onReset,
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
      className={`border-l-4 ${c.border} ${c.bg} rounded-r-lg p-5`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-3xl font-bold tracking-tight ${c.text}`}>{c.label}</p>
          <p className={`mt-1 text-sm ${c.sub}`}>{reason}</p>
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

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-md bg-white/80 px-3 py-2">
          <p className="text-xs text-slate-400">Purchase cost</p>
          <p className="text-sm font-semibold text-slate-900">{fmt(purchaseCost)}</p>
        </div>
        <div className="rounded-md bg-white/80 px-3 py-2">
          <p className="text-xs text-slate-400">Day 90 balance</p>
          <p className="text-sm font-semibold text-slate-900">{fmt(endBalance)}</p>
        </div>
        <div className="rounded-md bg-white/80 px-3 py-2">
          <p className="text-xs text-slate-400">Cash impact</p>
          <p className="text-sm font-semibold text-slate-900">{fmt(costImpact)}</p>
        </div>
        <div className="rounded-md bg-white/80 px-3 py-2">
          <p className="text-xs text-slate-400">Runway</p>
          <p className="text-sm font-semibold text-slate-900">{runway >= 90 ? "90+ days" : `${runway} days`}</p>
        </div>
      </div>
    </motion.div>
  );
}
