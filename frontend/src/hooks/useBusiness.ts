"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { API } from "@/lib/format";

interface BusinessData {
  company_name: string;
  min_safe_reserve: number;
  current_cash: number;
  currency: string;
}

export function useBusiness() {
  const { token, loading: authLoading } = useAuth();
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!token) { setLoading(false); return; }
    fetch(`${API}/api/business/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: BusinessData | null) => setBusiness(data))
      .catch(() => setBusiness(null))
      .finally(() => setLoading(false));
  }, [token, authLoading]);

  return { business, loading: authLoading || loading };
}
