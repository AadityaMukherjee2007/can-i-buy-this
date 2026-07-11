"use client";

import { motion } from "framer-motion";
import { Banknote } from "lucide-react";
import { fmt } from "@/lib/format";

interface Props {
  currentCash: number;
  minReserve: number;
  currency?: string;
}

export default function CashGauge({ currentCash, minReserve, currency }: Props) {
  const surplus = currentCash - minReserve;
  const ratio = minReserve > 0 ? Math.min(currentCash / minReserve, 2) : (currentCash > 0 ? 1 : 0);
  const fillPct = Math.max(0, Math.round((ratio / 2) * 100));

  let color: string;
  let label: string;
  if (surplus >= minReserve) {
    color = "bg-emerald-500";
    label = "Strong";
  } else if (surplus >= 0) {
    color = "bg-amber-500";
    label = "Adequate";
  } else {
    color = "bg-red-500";
    label = "Below reserve";
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Banknote className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Cash position</span>
        </div>
        <span className={`text-xs font-medium ${
          surplus >= minReserve ? "text-emerald-600" : surplus >= 0 ? "text-amber-600" : "text-red-600"
        }`}>
          {label}
        </span>
      </div>

      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="text-2xl font-bold text-slate-900">{fmt(currentCash, currency)}</span>
        <span className="text-xs text-slate-400">of {fmt(minReserve, currency)} reserve</span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={currentCash}
        aria-valuemin={0}
        aria-valuemax={Math.max(minReserve * 2, currentCash)}
        aria-label={`Cash position: ${label}`}
        className="h-2 rounded-full bg-slate-100 overflow-hidden"
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${fillPct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>

      <div className="flex justify-between mt-1 text-xs text-slate-400">
        <span>{currency ? fmt(0, currency) : "$0"}</span>
        <span>{fmt(minReserve, currency)}</span>
      </div>
    </div>
  );
}
