"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Shield, Database, BarChart3 } from "lucide-react";
import DashboardForm from "@/components/DashboardForm";
import DecisionBadge from "@/components/DecisionBadge";
import CashFlowChart from "@/components/CashFlowChart";
import CashGauge from "@/components/CashGauge";
import { useAuth } from "@/lib/auth";
import { API, fmt } from "@/lib/format";
import { useBusiness } from "@/hooks/useBusiness";

interface Result {
  decision: string;
  reason: string;
  wait_days: number | null;
  wait_date: string | null;
  chart_data: number[];
  current_cash: number;
  without_purchase_trajectory: number[];
  data_source: string;
  scenario_id: string;
  purchase_cost: number;
}

export default function Dashboard() {
  const router = useRouter();
  const { token, user, loading: authLoading } = useAuth();
  const { business, loading: bizLoading } = useBusiness();
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !token) router.push("/auth/login");
  }, [token, authLoading, router]);

  const handleSubmit = async (data: {
    purchase_name: string;
    purchase_cost: number;
    recurring_cost: number;
    expected_revenue: number;
    payment_delay_days: number;
  }) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API}/api/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || `Request failed (${res.status})`);
      }
      setResult(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => { setResult(null); setError(null); };

  if (authLoading || bizLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" role="status" aria-label="Loading" />
      </div>
    );
  }

  const minReserve = business?.min_safe_reserve ?? 5000;
  const companyName = business?.company_name || user?.full_name || "there";
  const currentCash = result?.current_cash ?? business?.current_cash ?? 0;
  const isDummy = result?.data_source === "dummy";
  const isSeeded = result?.data_source === "seeded";

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-10">
        <div className="flex items-start justify-between mb-6 sm:mb-8">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold text-slate-900 truncate">{companyName}</h1>
            <p className="text-sm text-slate-500 mt-0.5">Purchase evaluation</p>
          </div>
          {result && (
            <div className="shrink-0 flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-500">
              <Database className="h-3 w-3" />
              {isDummy ? "Demo" : isSeeded ? "Sample data" : "Live"}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6 lg:gap-8">
          <div className="lg:col-span-2 space-y-4 sm:space-y-5">
            {!result ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5"
              >
                <DashboardForm onSubmit={handleSubmit} loading={loading} />
              </motion.div>
            ) : (
              <DecisionBadge
                decision={result.decision}
                reason={result.reason}
                minReserve={minReserve}
                purchaseCost={result.purchase_cost}
                chartData={result.chart_data}
                withoutPurchaseData={result.without_purchase_trajectory}
                onReset={handleReset}
                waitDays={result.wait_days}
                waitDate={result.wait_date}
              />
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </motion.div>
            )}

            {!result && (
              <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
                <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Snapshot</h3>
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-slate-400 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Safe reserve</p>
                    <p className="text-sm font-semibold text-slate-900">{fmt(minReserve)}</p>
                  </div>
                </div>
                <CashGauge currentCash={currentCash} minReserve={minReserve} />
                {currentCash === 0 && (
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Database className="h-3 w-3" />
                    Add transactions to see your cash position
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-3 space-y-4 sm:space-y-5">
            {result ? (
              <>
                <CashFlowChart
                  withPurchase={result.chart_data}
                  withoutPurchase={result.without_purchase_trajectory}
                  minReserve={minReserve}
                  waitDays={result.wait_days}
                  waitDate={result.wait_date}
                />
                <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
                  <CashGauge
                    currentCash={result.current_cash}
                    minReserve={minReserve}
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-white p-8 sm:p-12 text-center min-h-[300px] sm:min-h-[400px]">
                <BarChart3 className="h-10 w-10 text-slate-300 mb-4" />
                <p className="text-sm font-medium text-slate-700">Enter a purchase to begin</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                  We&apos;ll project 90 days of cash flow and tell you if the purchase works.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
