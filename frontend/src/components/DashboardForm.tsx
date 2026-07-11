"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

interface FormData {
  purchase_name: string;
  purchase_cost: string;
  recurring_cost: string;
  expected_revenue: string;
  payment_delay_days: string;
}

interface Props {
  onSubmit: (data: {
    purchase_name: string;
    purchase_cost: number;
    recurring_cost: number;
    expected_revenue: number;
    payment_delay_days: number;
  }) => void;
  loading: boolean;
  currency?: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", INR: "₹", JPY: "¥",
  CAD: "CA$", AUD: "A$", BRL: "R$", SGD: "S$", AED: "د.إ",
};

function parseNum(v: string): number {
  const n = parseFloat(v);
  return isNaN(n) ? NaN : n;
}

function parseIntNum(v: string): number {
  const n = parseInt(v, 10);
  return isNaN(n) ? NaN : n;
}

export default function DashboardForm({ onSubmit, loading, currency }: Props) {
  const symbol = currency ? (CURRENCY_SYMBOLS[currency] ?? currency) : "$";
  const [form, setForm] = useState<FormData>({
    purchase_name: "",
    purchase_cost: "",
    recurring_cost: "",
    expected_revenue: "",
    payment_delay_days: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.purchase_name.trim()) e.purchase_name = "Name the purchase";
    const cost = parseNum(form.purchase_cost);
    if (!form.purchase_cost || isNaN(cost)) e.purchase_cost = "Enter a valid number";
    else if (cost <= 0) e.purchase_cost = "Must be positive";
    const recurring = parseNum(form.recurring_cost);
    if (form.recurring_cost && (isNaN(recurring) || recurring < 0)) e.recurring_cost = "Can't be negative";
    const revenue = parseNum(form.expected_revenue);
    if (form.expected_revenue && (isNaN(revenue) || revenue < 0)) e.expected_revenue = "Can't be negative";
    const delay = parseIntNum(form.payment_delay_days);
    if (form.payment_delay_days && (isNaN(delay) || delay < 0 || delay > 90))
      e.payment_delay_days = "0–90 days";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      purchase_name: form.purchase_name.trim(),
      purchase_cost: parseFloat(form.purchase_cost),
      recurring_cost: parseFloat(form.recurring_cost) || 0,
      expected_revenue: parseFloat(form.expected_revenue) || 0,
      payment_delay_days: parseInt(form.payment_delay_days, 10) || 0,
    });
  };

  const inputClass = (hasError: boolean) =>
    `w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors ${
      hasError ? "border-red-300" : "border-slate-200 hover:border-slate-300"
    } focus:border-slate-400 focus:outline-none`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="purchase_name" className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">
          What to buy
        </label>
        <input
          id="purchase_name"
          type="text"
          required
          placeholder="e.g. Office chairs, CRM license"
          value={form.purchase_name}
          onChange={(e) => setForm({ ...form, purchase_name: e.target.value })}
          className={inputClass(!!errors.purchase_name)}
        />
        {errors.purchase_name && <p className="mt-1 text-xs text-red-500">{errors.purchase_name}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="purchase_cost" className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">
            One-time cost
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">{symbol}</span>
            <input
              id="purchase_cost"
              type="number"
              required
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={form.purchase_cost}
              onChange={(e) => setForm({ ...form, purchase_cost: e.target.value })}
              className={`${inputClass(!!errors.purchase_cost)} pl-6`}
            />
          </div>
          {errors.purchase_cost && <p className="mt-1 text-xs text-red-500">{errors.purchase_cost}</p>}
        </div>
        <div>
          <label htmlFor="recurring_cost" className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">
            Per month
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">{symbol}</span>
            <input
              id="recurring_cost"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.recurring_cost}
              onChange={(e) => setForm({ ...form, recurring_cost: e.target.value })}
              className={`${inputClass(!!errors.recurring_cost)} pl-6`}
            />
          </div>
          {errors.recurring_cost && <p className="mt-1 text-xs text-red-500">{errors.recurring_cost}</p>}
        </div>
      </div>

      <details className="group">
        <summary className="text-xs font-medium text-slate-400 cursor-pointer hover:text-slate-600 transition-colors select-none">
          Advanced
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="expected_revenue" className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">
              Revenue generated
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">{symbol}</span>
              <input
                id="expected_revenue"
                type="number"
                min="0"
                step="0.01"
                placeholder="/mo"
                value={form.expected_revenue}
                onChange={(e) => setForm({ ...form, expected_revenue: e.target.value })}
                className={`${inputClass(!!errors.expected_revenue)} pl-6`}
              />
            </div>
            {errors.expected_revenue && <p className="mt-1 text-xs text-red-500">{errors.expected_revenue}</p>}
          </div>
          <div>
            <label htmlFor="payment_delay_days" className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">
              Payment terms
            </label>
            <input
              id="payment_delay_days"
              type="number"
              min="0"
              max="90"
              step="1"
              placeholder="days"
              value={form.payment_delay_days}
              onChange={(e) => setForm({ ...form, payment_delay_days: e.target.value })}
              className={inputClass(!!errors.payment_delay_days)}
            />
            {errors.payment_delay_days && <p className="mt-1 text-xs text-red-500">{errors.payment_delay_days}</p>}
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Revenue this purchase generates (monthly) and when payment is due (e.g. 30 for Net-30).
        </p>
      </details>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Evaluating
          </span>
        ) : (
          "Evaluate purchase"
        )}
      </button>
    </form>
  );
}
