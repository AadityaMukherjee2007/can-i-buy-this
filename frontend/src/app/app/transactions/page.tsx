"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Trash2, Upload, Download, Database, ArrowUpDown, Search, ChevronLeft, ChevronRight, X, Filter } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { API, fmt } from "@/lib/format";
import { useBusiness } from "@/hooks/useBusiness";

interface Transaction {
  id: string;
  amount: number;
  date: string;
  description: string | null;
  category: string | null;
  is_inflow: boolean | null;
  type: string | null;
  notes: string | null;
  payment_method: string | null;
  status: string;
  tags: string[] | null;
}

interface PaginatedResponse {
  items: Transaction[];
  total: number;
  page: number;
  per_page: number;
}

const CATEGORIES = [
  "Income", "Sales", "Consulting", "Freelance", "Retainer",
  "Expense", "Office supplies", "Software", "Utilities",
  "Contractor", "Marketing", "Rent", "Insurance", "Travel", "Other",
];

const PER_PAGE = 25;

export default function TransactionsPage() {
  const router = useRouter();
  const { token, loading: authLoading } = useAuth();
  const { business } = useBusiness();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [fetching, setFetching] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ amount: "", date: "", description: "", category: "", type: "", notes: "", payment_method: "", tags: "" });
  const [bulkJson, setBulkJson] = useState("");
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(false);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const currency = business?.currency || "USD";
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!authLoading && !token) router.push("/auth/login");
  }, [token, authLoading, router]);

  const buildUrl = useCallback((p: number) => {
    const params = new URLSearchParams();
    params.set("page", String(p));
    params.set("per_page", String(PER_PAGE));
    if (search) params.set("search", search);
    if (filterType) params.set("type", filterType);
    if (filterDateFrom) params.set("date_from", filterDateFrom);
    if (filterDateTo) params.set("date_to", filterDateTo);
    return `${API}/api/transactions?${params.toString()}`;
  }, [search, filterType, filterDateFrom, filterDateTo]);

  const fetchTx = useCallback(async (p: number) => {
    if (!token) return;
    setFetching(true);
    setError(null);
    try {
      const res = await fetch(buildUrl(p), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const detail = await res.json().then(b => b.detail).catch(() => null);
        throw new Error(detail || `Request failed (${res.status})`);
      }
      const data: PaginatedResponse = await res.json();
      setTransactions(data.items);
      setTotal(data.total);
      setPage(data.page);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load transactions");
    } finally {
      setFetching(false);
    }
  }, [token, buildUrl]);

  useEffect(() => { if (token) fetchTx(1); }, [token, fetchTx]);

  const debouncedSearch = useCallback((val: string) => {
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(val);
    }, 300);
  }, []);

  const sorted = useMemo(() =>
    [...transactions].sort((a, b) =>
      sortAsc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)
    ),
    [transactions, sortAsc]
  );

  const handleAdd = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount === 0) { setError("Enter a valid amount"); return; }
    if (!form.date) { setError("Select a date"); return; }
    try {
      const body: Record<string, unknown> = {
        amount,
        date: form.date,
        description: form.description,
        category: form.category || null,
      };
      if (form.type) body.type = form.type;
      if (form.notes) body.notes = form.notes;
      if (form.payment_method) body.payment_method = form.payment_method;
      if (form.tags.trim()) body.tags = form.tags.split(",").map(t => t.trim()).filter(Boolean);
      const res = await fetch(`${API}/api/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const b = await res.json().catch(() => null); throw new Error(b?.detail || "Add failed"); }
      setForm({ amount: "", date: "", description: "", category: "", type: "", notes: "", payment_method: "", tags: "" });
      setShowForm(false);
      setSuccess("Transaction added");
      fetchTx(page);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }, [token, form, page, fetchTx]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Delete this transaction?")) return;
    try {
      const res = await fetch(`${API}/api/transactions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      setSuccess("Transaction deleted");
      const nextPage = transactions.length <= 1 && page > 1 ? page - 1 : page;
      fetchTx(nextPage);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }, [token, transactions.length, page, fetchTx]);

  const handleBulkImport = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    let parsed: unknown;
    try { parsed = JSON.parse(bulkJson); } catch { setError("Invalid JSON"); return; }
    if (!Array.isArray(parsed) || parsed.length === 0) { setError("Provide a non-empty array"); return; }
    try {
      const res = await fetch(`${API}/api/transactions/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ transactions: parsed }),
      });
      if (!res.ok) { const b = await res.json().catch(() => null); throw new Error(b?.detail || "Import failed"); }
      const data = await res.json();
      setBulkJson("");
      setShowBulkImport(false);
      setSuccess(`Imported ${data.imported} transactions`);
      fetchTx(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }, [token, bulkJson, fetchTx]);

  const handleCsvUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter(Boolean);
      const txs: Record<string, unknown>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",");
        if (cols.length < 3) continue;
        const amount = parseFloat(cols[0].replace(/[^0-9.-]/g, ""));
        const date = cols[1].trim();
        const description = cols[2].trim();
        const category = cols[3]?.trim();
        if (isNaN(amount) || !date) continue;
        txs.push({ amount, date, description, category });
      }
      if (txs.length === 0) { setError("No valid rows found in CSV"); return; }
      try {
        const res = await fetch(`${API}/api/transactions/bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ transactions: txs }),
        });
        if (!res.ok) throw new Error("Import failed");
        const data = await res.json();
        setSuccess(`Imported ${data.imported} transactions from CSV`);
        fetchTx(1);
      } catch (err) {
        setError(err instanceof Error ? err.message : "CSV import failed");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, [token, fetchTx]);

  const goToPage = useCallback((p: number) => { fetchTx(p); }, [fetchTx]);

  const handleDeleteClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const id = e.currentTarget.getAttribute("data-id");
    if (id) handleDelete(id);
  }, [handleDelete]);

  const clearFilters = useCallback(() => {
    setSearch("");
    setSearchInput("");
    setFilterType("");
    setFilterDateFrom("");
    setFilterDateTo("");
    fetchTx(1);
  }, [fetchTx]);

  const hasFilters = search || filterType || filterDateFrom || filterDateTo;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" role="status" aria-label="Loading" />
      </div>
    );
  }

  const inputClass = "w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-slate-400 focus:outline-none";

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Transactions</h1>
            <p className="text-sm text-slate-500 mt-0.5">Your business transaction history</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowBulkImport(!showBulkImport); setShowForm(false); }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Upload className="h-3.5 w-3.5 inline mr-1" />
              Import
            </button>
            <button
              onClick={() => { setShowForm(!showForm); setShowBulkImport(false); }}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition-colors"
            >
              <Plus className="h-3.5 w-3.5 inline mr-1" />
              Add
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700" role="alert">{error}</div>
        )}
        {success && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700" role="status">{success}</div>
        )}

        {total > 0 && (
          <div className="mb-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => debouncedSearch(e.target.value)}
                  placeholder="Search across all transactions..."
                  className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 placeholder-slate-400 hover:border-slate-300 focus:border-slate-400 focus:outline-none transition-colors"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                  hasFilters ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Filter className="h-4 w-4" />
              </button>
            </div>

            {showFilters && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-slate-200 bg-white p-3 space-y-3"
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Type</label>
                    <select value={filterType} onChange={(e) => { setFilterType(e.target.value); fetchTx(1); }} className={inputClass}>
                      <option value="">All</option>
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                      <option value="transfer">Transfer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">From</label>
                    <input type="date" value={filterDateFrom} onChange={(e) => { setFilterDateFrom(e.target.value); fetchTx(1); }} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">To</label>
                    <input type="date" value={filterDateTo} onChange={(e) => { setFilterDateTo(e.target.value); fetchTx(1); }} className={inputClass} />
                  </div>
                  <div className="flex items-end">
                    <button onClick={clearFilters} className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50">
                      <X className="h-3 w-3" /> Clear
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {showForm && (
          <motion.form
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleAdd}
            className="mb-6 rounded-lg border border-slate-200 bg-white p-4 space-y-3"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Amount ({currency})</label>
                <input type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputClass} placeholder="500.00" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
                <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputClass}>
                  <option value="">Auto</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                  <option value="transfer">Transfer</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass}>
                  <option value="">None</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} placeholder="Invoice payment" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Payment method</label>
                <input type="text" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} className={inputClass} placeholder="Bank transfer" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Tags</label>
                <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className={inputClass} placeholder="comma,separated" />
              </div>
              <div className="sm:col-span-4">
                <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className={inputClass} placeholder="Optional notes" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700">Cancel</button>
              <button type="submit" className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800">Add transaction</button>
            </div>
          </motion.form>
        )}

        {showBulkImport && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-lg border border-slate-200 bg-white p-4 space-y-3"
          >
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
                <Download className="h-4 w-4" />
                Upload CSV
                <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
              </label>
              <span className="text-xs text-slate-400">CSV: amount,date,description,category</span>
            </div>
            <details className="text-xs text-slate-500">
              <summary className="cursor-pointer hover:text-slate-700">Or paste JSON</summary>
              <form onSubmit={handleBulkImport} className="mt-2 space-y-2">
                <textarea value={bulkJson} onChange={(e) => setBulkJson(e.target.value)} rows={4} className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-mono focus:border-slate-400 focus:outline-none" placeholder='[{"amount": 5000, "date": "2026-07-01", "description": "Invoice", "category": "Income"}]' />
                <button type="submit" className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800">Import JSON</button>
              </form>
            </details>
          </motion.div>
        )}

        {fetching ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
          </div>
        ) : total === 0 && !error ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-white p-12 text-center">
            <Database className="h-10 w-10 text-slate-300 mb-4" />
            <p className="text-sm font-medium text-slate-700">No transactions yet</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Add transactions manually or import from CSV to get started.
            </p>
            <button onClick={() => setShowForm(true)} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
              <Plus className="h-4 w-4 inline mr-1" />
              Add your first transaction
            </button>
          </div>
        ) : total === 0 && error ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-white p-12 text-center">
            <Database className="h-10 w-10 text-slate-300 mb-4" />
            <p className="text-sm font-medium text-slate-700">Unable to load transactions</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              {error}. Make sure the backend is running and refresh the page.
            </p>
            <button onClick={() => fetchTx(1)} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
              Retry
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 cursor-pointer hover:text-slate-700 select-none" onClick={() => setSortAsc(!sortAsc)}>
                      <ArrowUpDown className="h-3 w-3 inline mr-1" />
                      Date
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Description</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500">Amount</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((tx) => {
                    const isIncome = tx.type === "income" || (tx.is_inflow ?? tx.amount > 0);
                    return (
                      <tr key={tx.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{tx.date}</td>
                        <td className="px-4 py-2.5 text-sm text-slate-900">
                          <div>{tx.description || "-"}</div>
                          {(tx.tags && tx.tags.length > 0) && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {tx.tags.map((tag) => (
                                <span key={tag} className="inline-block rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{tag}</span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className={`px-4 py-2.5 text-sm font-medium text-right whitespace-nowrap ${isIncome ? "text-emerald-600" : "text-red-600"}`}>
                          {isIncome ? "+" : ""}{fmt(Math.abs(tx.amount), currency)}
                        </td>
                        <td className="px-2 py-2.5">
                          <button data-id={tx.id} onClick={handleDeleteClick} className="rounded p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors" aria-label="Delete transaction">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-100 px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {hasFilters && search ? `${sorted.length} match${sorted.length !== 1 ? "es" : ""} (page ${page})` : `${total} total transaction${total !== 1 ? "s" : ""}`}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => goToPage(page - 1)} disabled={page <= 1} className="rounded p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" aria-label="Previous page">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                  if (totalPages > 7 && p !== 1 && p !== totalPages && Math.abs(p - page) > 2) {
                    if (Math.abs(p - page) === 3) return <span key={p} className="px-1 text-xs text-slate-300">...</span>;
                    return null;
                  }
                  return (
                    <button key={p} onClick={() => goToPage(p)} className={`min-w-[28px] rounded px-2 py-1 text-xs font-medium transition-colors ${p === page ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"}`}>
                      {p}
                    </button>
                  );
                })}
                <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages} className="rounded p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" aria-label="Next page">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
