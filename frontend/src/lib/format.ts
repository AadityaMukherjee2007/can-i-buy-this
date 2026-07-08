export const API = process.env.NEXT_PUBLIC_API_URL ?? "";

export const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(v);
