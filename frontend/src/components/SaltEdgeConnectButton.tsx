"use client";

import { useState, useCallback } from "react";
import { Loader2, Building2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { API } from "@/lib/format";

interface Props {
  onSuccess?: () => void;
}

export default function SaltEdgeConnectButton({ onSuccess }: Props) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API}/api/saltedge/session`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to get connect session");
      const { connect_url } = await res.json();

      const popup = window.open(connect_url, "saltedge-connect", "width=800,height=700");
      if (!popup) {
        setError("Pop-up blocked. Please allow pop-ups for this site.");
        return;
      }

      const poll = setInterval(async () => {
        if (popup.closed) {
          clearInterval(poll);
          try {
            const storeRes = await fetch(`${API}/api/saltedge/store-connection`, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
            });
            if (storeRes.ok) {
              await fetch(`${API}/api/saltedge/transactions`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              onSuccess?.();
            }
          } catch {
            setError("Failed to store connection");
          }
          setLoading(false);
        }
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
      setLoading(false);
    }
  }, [token, onSuccess]);

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
        onClick={handleConnect}
        disabled={loading}
        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Connecting...
          </span>
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
