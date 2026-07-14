export const CURRENCIES = [
  "AED","AFN","ALL","AMD","ANG","AOA","ARS","AUD","AWG","AZN",
  "BAM","BBD","BDT","BGN","BHD","BIF","BMD","BND","BOB","BRL",
  "BSD","BTN","BWP","BYN","BZD",
  "CAD","CDF","CHF","CLF","CLP","CNY","COP","CRC","CUC","CUP",
  "CVE","CZK",
  "DJF","DKK","DOP","DZD",
  "EGP","ERN","ETB","EUR",
  "FJD","FKP",
  "GBP","GEL","GHS","GIP","GMD","GNF","GTQ","GYD",
  "HKD","HNL","HRK","HTG","HUF",
  "IDR","ILS","INR","IQD","IRR","ISK",
  "JMD","JOD","JPY",
  "KES","KGS","KHR","KMF","KPW","KRW","KWD","KYD","KZT",
  "LAK","LBP","LKR","LRD","LSL","LYD",
  "MAD","MDL","MGA","MKD","MMK","MNT","MOP","MRU","MUR",
  "MVR","MWK","MXN","MYR","MZN",
  "NAD","NGN","NIO","NOK","NPR","NZD",
  "OMR",
  "PAB","PEN","PGK","PHP","PKR","PLN","PYG",
  "QAR",
  "RON","RSD","RUB","RWF",
  "SAR","SBD","SCR","SDG","SEK","SGD","SHP","SLE","SLL",
  "SOS","SRD","SSP","STN","SVC","SYP","SZL",
  "THB","TJS","TMT","TND","TOP","TRY","TTD","TWD","TZS",
  "UAH","UGX","USD","UYU","UZS",
  "VED","VES","VND","VUV",
  "WST",
  "XAF","XCD","XDR","XOF","XPF",
  "YER",
  "ZAR","ZMW","ZWL",
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number];

function genSymbol(code: string): string {
  try {
    const s = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 0,
    }).format(0);
    const sym = s.replace(/[\d,.\s]/g, "").trim();
    return sym.length > 0 ? sym : code;
  } catch { return code; }
}

const symbolCache = new Map<string, string>();
export function getCurrencySymbol(code: string): string {
  let s = symbolCache.get(code);
  if (!s) { s = genSymbol(code); symbolCache.set(code, s); }
  return s;
}

const nameCache = new Map<string, string>();
export function getCurrencyName(code: string): string {
  let n = nameCache.get(code);
  if (!n) {
    try {
      n = new Intl.DisplayNames("en", { type: "currency" }).of(code) || code;
    } catch { n = code; }
    nameCache.set(code, n);
  }
  return n;
}

export const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({
  code: c,
  symbol: getCurrencySymbol(c),
  name: getCurrencyName(c),
}));
