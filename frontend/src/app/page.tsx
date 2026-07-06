"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2, AlertTriangle, XCircle, DollarSign } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { fmt } from "@/lib/format";

interface Example {
  purchase: string;
  cost: number;
  decision: "YES" | "NO" | "WAIT";
  reason: string;
  impact: { label: string; value: string };
}

const examples: Example[] = [
  { purchase: "MacBook Pro 16-inch", cost: 2499, decision: "YES", reason: "Cash stays above reserve across the 90-day projection.", impact: { label: "Day 90 balance", value: "$8,423" } },
  { purchase: "Annual SaaS License", cost: 15000, decision: "NO", reason: "Cost exceeds cash available at payment date.", impact: { label: "Cash at payment", value: "$11,200" } },
  { purchase: "Office Furniture Set", cost: 5200, decision: "WAIT", reason: "Cash recovers in 18 days. Buy then.", impact: { label: "Wait", value: "18 days" } },
];

const decisionIcon: Record<string, typeof CheckCircle2> = {
  YES: CheckCircle2,
  NO: XCircle,
  WAIT: AlertTriangle,
};

export default function LandingPage() {
  const { user } = useAuth();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const current = examples[index];

  useEffect(() => {
    if (!paused) {
      intervalRef.current = setInterval(() => setIndex((i) => (i + 1) % examples.length), 3500);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused]);

  const decisionColors = {
    YES: { bg: "bg-emerald-50", text: "text-emerald-600" },
    NO: { bg: "bg-red-50", text: "text-red-600" },
    WAIT: { bg: "bg-amber-50", text: "text-amber-600" },
  };
  const dc = decisionColors[current.decision];
  const Icon = decisionIcon[current.decision];

  return (
    <div>
      <section className="min-h-[calc(100vh-57px)] flex items-center bg-white">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-16 sm:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <p className="text-xs font-medium text-slate-400 uppercase tracking-[0.15em] mb-4">
                Cash flow decision engine
              </p>
              <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-[1.1] tracking-tight mb-5">
                One purchase.<br/>One clear decision.
              </h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-md mb-8">
                Enter what you want to buy and its cost. We project 90 days of
                cash flow from your financial data and give you a yes, no, or
                wait — with the numbers to back it up.
              </p>
              <div className="flex items-center gap-4">
                {user ? (
                  <Link href="/app" className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors">
                    Go to dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <>
                    <Link href="/auth/register" className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors">
                      Start evaluating
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link href="/auth/login" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
                      Sign in
                    </Link>
                  </>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="relative"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
            >
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between bg-slate-50 border-b border-slate-100 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-medium text-slate-500">Purchase evaluation</span>
                  </div>
                </div>
                <div className="p-5">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex items-baseline justify-between mb-4">
                        <p className="text-sm font-medium text-slate-900">{current.purchase}</p>
                        <p className="text-sm font-semibold text-slate-900">{fmt(current.cost)}</p>
                      </div>

                      <div className={`flex items-center gap-2 rounded-lg ${dc.bg} px-3.5 py-2.5 mb-3`}>
                        <Icon className={`h-5 w-5 ${dc.text}`} />
                        <span className={`text-base font-bold ${dc.text}`}>{current.decision}</span>
                      </div>

                      <p className="text-sm text-slate-600 mb-4">{current.reason}</p>

                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-medium">{current.impact.label}:</span>
                        <span className="font-semibold text-slate-700">{current.impact.value}</span>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  <div className="flex items-center justify-center gap-1.5 mt-5" role="tablist" aria-label="Decision examples">
                    {examples.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setIndex(i)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? "w-6 bg-slate-900" : "w-1.5 bg-slate-300 hover:bg-slate-400"}`}
                        role="tab"
                        aria-selected={i === index}
                        aria-label={`Example ${i + 1}: ${examples[i].decision}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 border-t border-slate-200">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-20 sm:py-28">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xs font-medium text-slate-400 uppercase tracking-[0.15em] text-center mb-12"
          >
            How it works
          </motion.p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {[
              { number: "01", title: "Enter your purchase", desc: "Tell us what you want to buy and how much it costs." },
              { number: "02", title: "We analyze your cash flow", desc: "We project 90 days of income and expenses." },
              { number: "03", title: "Get your decision", desc: "Yes, no, or wait — each with a clear financial reason." },
            ].map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="text-center"
              >
                <p className="text-2xl font-bold text-slate-200 mb-3">{step.number}</p>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-20 sm:py-28 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
              Ready to make your next purchase decision?
            </h2>
            <p className="text-sm text-slate-500 mb-8 max-w-sm mx-auto">
              No credit card. No bank connection required to try it out.
            </p>
            <Link
              href={user ? "/app" : "/auth/register"}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
            >
              {user ? "Go to dashboard" : "Start evaluating"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
