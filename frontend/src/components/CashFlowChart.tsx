"use client";

import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { fmt } from "@/lib/format";

interface Props {
  withPurchase: number[];
  withoutPurchase: number[];
  minReserve: number;
  waitDays?: number | null;
  waitDate?: string | null;
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: number }) {
  if (!active || !payload || payload.length === 0) return null;
  const wp = payload.find((p) => p.dataKey === "withPurchase")?.value ?? 0;
  const wop = payload.find((p) => p.dataKey === "withoutPurchase")?.value ?? 0;
  const diff = wp - wop;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-slate-700 mb-1">{label === 1 ? "Today" : `Day ${label}`}</p>
      <div className="space-y-0.5">
        <p className="flex justify-between gap-4">
          <span className="text-slate-500">Without purchase</span>
          <span className="font-medium text-slate-700">{fmt(wop)}</span>
        </p>
        <p className="flex justify-between gap-4">
          <span className="text-slate-500">With purchase</span>
          <span className="font-medium text-slate-900">{fmt(wp)}</span>
        </p>
        <div className="border-t border-slate-100 mt-1 pt-1 flex justify-between gap-4">
          <span className="text-slate-500">Difference</span>
          <span className={`font-medium ${diff >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {diff >= 0 ? "+" : ""}{fmt(diff)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function CashFlowChart({ withPurchase, withoutPurchase, minReserve, waitDays, waitDate }: Props) {
  const chartData = withPurchase.map((value, i) => ({
    day: i + 1,
    withPurchase: Math.round(value * 100) / 100,
    withoutPurchase: Math.round((withoutPurchase[i] ?? 0) * 100) / 100,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">90-Day Cash Flow</h3>
      <div className="h-56 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
              tickFormatter={(v) => v === 1 ? "Today" : `D${v}`}
              interval={14}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={fmt}
              width={72}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend
              formatter={(value: string) => (value === "withPurchase" ? "With purchase" : "Without purchase")}
              wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }}
              iconType="plainline"
            />
            <ReferenceLine
              y={minReserve}
              stroke="#dc2626"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: "Min reserve",
                position: "insideTopRight",
                fill: "#dc2626",
                fontSize: 10,
              }}
            />
            {waitDays != null && (
              <ReferenceLine
                x={waitDays}
                stroke="#f59e0b"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                label={{
                  value: waitDate ? formatDate(waitDate) : "Buy on day " + waitDays,
                  position: "top",
                  fill: "#f59e0b",
                  fontSize: 10,
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="withoutPurchase"
              stroke="#cbd5e1"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={false}
              activeDot={{ r: 3, fill: "#cbd5e1" }}
              animationBegin={200}
              animationDuration={1000}
              isAnimationActive={true}
            />
            <Line
              type="monotone"
              dataKey="withPurchase"
              stroke="#0f172a"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#0f172a" }}
              animationBegin={400}
              animationDuration={1000}
              isAnimationActive={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
