"use client";

import { useState, useEffect, useCallback } from "react";
import { usePlaidLink } from "react-plaid-link";
import { Loader2, Building2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { API } from "@/lib/format";

interface Props {
  onSuccess?: () => void;
}

export default function PlaidLinkButton({ onSuccess }: Props) {
  const { token } = useAuth();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/plaid/create_link_token`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to get link token");
        return res.json();
      })
      .then((data: { link_token: string }) => setLinkToken(data.link_token))
      .catch((err) => setError(err.message));
  }, [token]);

  const handleSuccess = useCallback(
    async (public_token: string) => {
      try {
        const res = await fetch(`${API}/api/plaid/exchange_token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ public_token }),
        });
        if (!res.ok) throw new Error("Failed to exchange token");
        onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Exchange failed");
      }
    },
    [token, onSuccess],
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (public_token: string) => handleSuccess(public_token),
  });

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <Building2 className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={() => open()}
        disabled={!ready}
        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {!linkToken && !error ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Preparing...
          </span>
        ) : error ? (
          <span className="flex items-center justify-center gap-2">Retry</span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Building2 className="h-4 w-4" />
            Connect bank account
          </span>
        )}
      </button>
    </div>
  );
}
