export const API = process.env.NEXT_PUBLIC_API_URL ?? "";

const LOCALE_MAP: Record<string, string> = {
  USD: "en-US", EUR: "de-DE", GBP: "en-GB", INR: "en-IN",
  JPY: "ja-JP", CAD: "en-CA", AUD: "en-AU", BRL: "pt-BR",
  SGD: "en-SG", AED: "ar-AE",
};

export const fmt = (v: number, currency?: string) =>
  new Intl.NumberFormat(currency ? (LOCALE_MAP[currency] ?? "en-US") : "en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 0,
  }).format(v);
