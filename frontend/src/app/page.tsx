"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useMotionValue, useMotionValueEvent, animate } from "framer-motion";
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

const decisionColors = {
  YES: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200" },
  NO: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200" },
  WAIT: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200" },
};

const steps = [
  { number: "01", title: "Enter your purchase", desc: "Tell us what you want to buy and how much it costs." },
  { number: "02", title: "We analyze your cash flow", desc: "We project 90 days of income and expenses." },
  { number: "03", title: "Get your decision", desc: "Yes, no, or wait — each with a clear financial reason." },
];

const easeOut = [0.25, 0.1, 0.25, 1] as const;

const childUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: easeOut } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6 } },
};

function CashFlowChart() {
  return (
    <svg viewBox="0 0 400 120" className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="heroFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.15" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="heroLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="50%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
      </defs>
      <motion.path
        d="M0,35 C40,33 80,38 130,35 C170,32 200,28 230,55 C255,78 275,85 300,65 C325,45 355,38 400,35"
        fill="none"
        stroke="url(#heroLine)"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 3, ease: "easeInOut", delay: 0.5 }}
      />
      <motion.path
        d="M0,35 C40,33 80,38 130,35 C170,32 200,28 230,55 C255,78 275,85 300,65 C325,45 355,38 400,35 L400,120 L0,120 Z"
        fill="url(#heroFill)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2, delay: 2 }}
      />
      <motion.circle
        cx="230" cy="55" r="4" fill="#ef4444"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 2.5, type: "spring", stiffness: 300, damping: 15 }}
      />
      <motion.text
        x="230" y="45" textAnchor="middle" fill="#ef4444" fontSize="8" fontWeight="600"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 3 }}
      >
        bad purchase
      </motion.text>
    </svg>
  );
}

function AnimatedCount({ to, prefix = "", suffix = "" }: { to: number; prefix?: string; suffix?: string }) {
  const [triggered, setTriggered] = useState(false);
  const [display, setDisplay] = useState("0");
  const ref = useRef<HTMLSpanElement>(null);
  const count = useMotionValue(0);

  useMotionValueEvent(count, "change", (latest) => {
    setDisplay(prefix + String(Math.round(latest)) + suffix);
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setTriggered(true); observer.disconnect(); } },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!triggered) return;
    const controls = animate(count, to, { duration: 1.5, ease: "easeOut" });
    return () => controls.stop();
  }, [triggered, to, count]);

  return <span ref={ref}>{display}</span>;
}

function ProblemCard({ example, index }: { example: Example; index: number }) {
  const Icon = decisionIcon[example.decision];
  const dc = decisionColors[example.decision];
  const danger = example.decision !== "YES";

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay: index * 0.15, ease: [0.25, 0.1, 0.25, 1] }}
      whileHover={{ y: -4 }}
      className={`rounded-xl border ${danger ? "border-red-900/30" : "border-emerald-900/30"} bg-slate-800/50 p-5 backdrop-blur-sm`}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-slate-200">{example.purchase}</p>
        <span className={`text-sm font-bold ${danger ? "text-red-400" : "text-emerald-400"}`}>
          {fmt(example.cost)}
        </span>
      </div>
      <div className={`flex items-center gap-2 rounded-lg ${dc.bg} px-3 py-2 mb-3`}>
        <Icon className={`h-4 w-4 ${dc.text}`} />
        <span className={`text-sm font-bold ${dc.text}`}>
          {example.decision === "YES" ? "Safe purchase" : example.decision === "NO" ? "Too risky" : "Buy later"}
        </span>
      </div>
      <p className="text-sm text-slate-400 leading-relaxed mb-3">{example.reason}</p>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-500">{example.impact.label}:</span>
        <motion.span
          key={`${index}-${example.impact.value}`}
          initial={{ opacity: 0, y: 4 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-semibold text-slate-300"
        >
          {example.impact.value}
        </motion.span>
      </div>
    </motion.div>
  );
}

export default function LandingPage() {
  const { user } = useAuth();
  const [cardIndex, setCardIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const current = examples[cardIndex];
  const dc = decisionColors[current.decision];
  const Icon = decisionIcon[current.decision];

  useEffect(() => {
    if (!paused) {
      intervalRef.current = setInterval(() => setCardIndex((i) => (i + 1) % examples.length), 3500);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [paused]);

  return (
    <div>
      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.08]">
          <CashFlowChart />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900" />
        <div className="relative mx-auto w-full max-w-5xl px-4 sm:px-6 py-24 sm:py-32">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.15 } }, hidden: {} }}
          >
            <motion.p variants={childUp} className="text-xs font-medium text-slate-500 uppercase tracking-[0.15em] mb-5">
              Cash flow decision engine
            </motion.p>
            <motion.h1 variants={childUp} className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.08] tracking-tight mb-5 max-w-2xl">
              One bad purchase can undo months of growth.
            </motion.h1>
            <motion.p variants={childUp} className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-lg mb-10">
              Know before you buy — with 90-day projections, not gut feelings. Enter a purchase, get a clear yes, no, or wait.
            </motion.p>
            <motion.div variants={childUp} className="flex items-center gap-4">
              {user ? (
                <Link href="/app" className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100 transition-colors">
                  Go to dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <>
                  <Link href="/auth/register" className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100 transition-colors">
                    Start evaluating
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/auth/login" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
                    Sign in
                  </Link>
                </>
              )}
            </motion.div>
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-5 h-8 rounded-full border-2 border-slate-600 flex items-start justify-center pt-1.5"
          >
            <div className="w-1 h-2 rounded-full bg-slate-500" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── The Cost of Guessing ── */}
      <section className="bg-slate-800 border-t border-slate-700/50">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-20 sm:py-28">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={{ visible: { transition: { staggerChildren: 0.12 } }, hidden: {} }}
            className="text-center mb-14"
          >
            <motion.p variants={fadeIn} className="text-xs font-medium text-slate-500 uppercase tracking-[0.15em] mb-4">
              The cost of guessing
            </motion.p>
            <motion.h2 variants={childUp} className="text-3xl sm:text-4xl font-bold text-white leading-[1.15] tracking-tight mb-4">
              Every purchase is a bet<br />when you don&apos;t have the numbers.
            </motion.h2>
            <motion.p variants={childUp} className="text-slate-400 max-w-lg mx-auto">
              Without projections, a single purchase can drain your runway. See what happens when businesses buy without knowing.
            </motion.p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {examples.map((ex, i) => (
              <ProblemCard key={ex.purchase} example={ex} index={i} />
            ))}
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8 }}
            className="text-center mt-10 text-sm text-slate-500"
          >
            <span className="text-slate-400 font-semibold">
              <AnimatedCount to={22200} prefix="$" />
            </span>{" "}
            in purchases evaluated — every decision backed by data.
          </motion.p>
        </div>
      </section>

      {/* ── Decision Engine ── */}
      <section className="bg-white border-t border-slate-200">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-20 sm:py-28">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={{ visible: { transition: { staggerChildren: 0.12 } }, hidden: {} }}
            className="text-center mb-14"
          >
            <motion.p variants={fadeIn} className="text-xs font-medium text-slate-400 uppercase tracking-[0.15em] mb-4">
              The decision engine
            </motion.p>
            <motion.h2 variants={childUp} className="text-3xl sm:text-4xl font-bold text-slate-900 leading-[1.15] tracking-tight mb-4">
              One clear decision.<br />Every time.
            </motion.h2>
            <motion.p variants={childUp} className="text-slate-500 max-w-lg mx-auto">
              Enter what you want to buy. We project 90 days of cash flow. You get a yes, no, or wait — with the numbers to prove it.
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="max-w-lg mx-auto"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            tabIndex={0}
          >
            <motion.div
              whileHover={{ y: -4, boxShadow: "0 12px 40px rgba(0,0,0,0.08)" }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
            >
              <div className="flex items-center justify-between bg-slate-50 border-b border-slate-100 px-5 py-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-slate-400" />
                  <span className="text-xs font-medium text-slate-500">Purchase evaluation</span>
                </div>
              </div>
              <div className="p-5">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={cardIndex}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ type: "spring", stiffness: 200, damping: 22, mass: 0.8 }}
                  >
                    <div className="flex items-baseline justify-between mb-4">
                      <p className="text-sm font-medium text-slate-900">{current.purchase}</p>
                      <p className="text-sm font-semibold text-slate-900">{fmt(current.cost)}</p>
                    </div>

                    <motion.div
                      initial={{ scaleX: 0.95, opacity: 0 }}
                      animate={{ scaleX: 1, opacity: 1 }}
                      transition={{ delay: 0.1, duration: 0.3 }}
                      className={`flex items-center gap-2 rounded-lg ${dc.bg} px-3.5 py-2.5 mb-3`}
                    >
                      <Icon className={`h-5 w-5 ${dc.text}`} />
                      <span className={`text-base font-bold ${dc.text}`}>{current.decision}</span>
                    </motion.div>

                    <p className="text-sm text-slate-600 mb-4">{current.reason}</p>

                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-medium">{current.impact.label}:</span>
                      <motion.span
                        key={`${cardIndex}-${current.impact.value}`}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="font-semibold text-slate-700"
                      >
                        {current.impact.value}
                      </motion.span>
                    </div>
                  </motion.div>
                </AnimatePresence>

                <div className="flex items-center justify-center gap-1.5 mt-5" role="tablist" aria-label="Decision examples">
                  {examples.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCardIndex(i)}
                      className="relative h-1.5"
                      role="tab"
                      aria-selected={i === cardIndex}
                      aria-label={`Example ${i + 1}: ${examples[i].decision}`}
                    >
                      {i === cardIndex ? (
                        <motion.div
                          layoutId="activeDot"
                          className="h-1.5 w-6 rounded-full bg-slate-900"
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        />
                      ) : (
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-300 hover:bg-slate-400 transition-colors" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="bg-slate-50 border-t border-slate-200">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-20 sm:py-28">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xs font-medium text-slate-400 uppercase tracking-[0.15em] text-center mb-14"
          >
            How it works
          </motion.p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.15, ease: [0.25, 0.1, 0.25, 1] }}
                className="text-center group"
              >
                <motion.p
                  whileHover={{ scale: 1.15 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="text-2xl font-bold text-slate-200 mb-3 group-hover:text-slate-300 transition-colors"
                >
                  {step.number}
                </motion.p>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-white border-t border-slate-200">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-20 sm:py-28 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={{ visible: { transition: { staggerChildren: 0.12 } }, hidden: {} }}
          >
            <motion.h2 variants={childUp} className="text-3xl sm:text-4xl font-bold text-slate-900 leading-[1.15] tracking-tight mb-4">
              Stop guessing.<br />Start knowing.
            </motion.h2>
            <motion.p variants={childUp} className="text-slate-500 mb-8 max-w-sm mx-auto">
              No credit card. No bank connection required to try it out. Enter a purchase and see your decision in seconds.
            </motion.p>
            <motion.div variants={childUp}>
              <Link
                href={user ? "/app" : "/auth/register"}
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-lg bg-slate-900 px-7 py-3.5 text-sm font-semibold text-white transition-all hover:bg-slate-800"
              >
                <motion.span
                  className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: "100%" }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                />
                <span className="relative">{user ? "Go to dashboard" : "Start evaluating"}</span>
                <motion.span
                  className="relative"
                  animate={{ x: [0, 3, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <ArrowRight className="h-4 w-4" />
                </motion.span>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
