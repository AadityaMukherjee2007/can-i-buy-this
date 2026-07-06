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
}

export default function CashFlowChart({ withPurchase, withoutPurchase, minReserve }: Props) {
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
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
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
              width={64}
            />
            <Tooltip
              formatter={(value, name) => {
                const v = Number(value) || 0;
                return [fmt(v), name === "withPurchase" ? "With purchase" : "Without purchase"];
              }}
              labelFormatter={(label) => label === 1 ? "Today" : `Day ${label}`}
              contentStyle={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                fontSize: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}
            />
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
