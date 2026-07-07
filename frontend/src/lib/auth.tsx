"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { API } from "@/lib/format";

interface User {
  email: string;
  full_name: string;
  id: string;
}

interface AuthContext {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, full_name: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthCtx = createContext<AuthContext | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Synchronize auth state from localStorage after mount.
  // Running during SSR is safe because both the initial render on the server
  // and the first client render (hydration) see loading=true, so consuming
  // components can return null and avoid hydration mismatches.
  useEffect(() => {
    const t = localStorage.getItem("token");
    const u = localStorage.getItem("user");
    if (t && u) {
      setToken(t);
      try { setUser(JSON.parse(u)); } catch {}
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.detail || "Login failed");
    }
    const data = await res.json();
    localStorage.setItem("token", data.access_token);
    const userData: User = { email: data.user.email, full_name: data.user.full_name, id: data.user.id };
    localStorage.setItem("user", JSON.stringify(userData));
    setToken(data.access_token);
    setUser(userData);
  }, []);

  const register = useCallback(async (email: string, password: string, full_name: string) => {
    const res = await fetch(`${API}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, full_name }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.detail || "Registration failed");
    }
    const data = await res.json();
    localStorage.setItem("token", data.access_token);
    const userData: User = { email: data.user.email, full_name: data.user.full_name, id: data.user.id };
    localStorage.setItem("user", JSON.stringify(userData));
    setToken(data.access_token);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  }, []);

  return <AuthCtx.Provider value={{ user, token, login, register, logout, loading }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
