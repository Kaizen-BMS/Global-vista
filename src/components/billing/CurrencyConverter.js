"use client";
import { useEffect, useState } from "react";
import { Globe2, Loader2 } from "lucide-react";

/**
 * Purely informational "what would this cost me" widget for a visitor
 * paying in a currency other than INR — every real charge on this
 * platform still goes through Razorpay/BillDesk in INR (see gst.js and
 * the checkout code paths), this never feeds a number back into billing.
 * Rates come from a free, keyless FX API (open.er-api.com, refreshed
 * daily server-side by that service) — if it's unreachable this quietly
 * hides itself rather than blocking the actual "Proceed to Pay" action,
 * since an approximate currency preview is a nice-to-have, not something
 * checkout should ever depend on.
 */
const CURRENCIES = [
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "AED", label: "UAE Dirham", symbol: "AED " },
  { code: "SGD", label: "Singapore Dollar", symbol: "S$" },
  { code: "AUD", label: "Australian Dollar", symbol: "A$" },
  { code: "CAD", label: "Canadian Dollar", symbol: "C$" },
];

let ratesCache = null; // module-level — one fetch per page load covers every InvoicePreview instance
let ratesPromise = null;

function fetchRates() {
  if (ratesCache) return Promise.resolve(ratesCache);
  if (!ratesPromise) {
    ratesPromise = fetch("https://open.er-api.com/v6/latest/INR")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("bad response"))))
      .then((data) => {
        if (data?.result !== "success" || !data?.rates) throw new Error("bad payload");
        ratesCache = data.rates;
        return ratesCache;
      })
      .catch(() => null);
  }
  return ratesPromise;
}

export default function CurrencyConverter({ amountInr, dark = false }) {
  const [rates, setRates] = useState(ratesCache);
  const [loading, setLoading] = useState(!ratesCache);
  const [code, setCode] = useState("USD");

  useEffect(() => {
    let cancelled = false;
    if (!rates) {
      fetchRates().then((r) => { if (!cancelled) { setRates(r); setLoading(false); } });
    }
    return () => { cancelled = true; };
  }, [rates]);

  if (!loading && !rates) return null; // FX service unreachable — never block checkout over this
  const rate = rates?.[code];
  const converted = rate ? amountInr * rate : null;
  const currency = CURRENCIES.find((c) => c.code === code);

  const faint = dark ? "text-white/40" : "text-muted-foreground";
  const strong = dark ? "text-white" : "text-foreground";
  const selectClass = dark ? "px-2 py-1 rounded-md bg-white/5 border border-white/10 text-white text-xs cursor-pointer" : "px-2 py-1 rounded-md bg-muted border border-border text-foreground text-xs cursor-pointer";
  return (
    <div className="flex items-center gap-2 flex-wrap text-xs">
      <span className={`flex items-center gap-1 ${faint}`}><Globe2 className="h-3.5 w-3.5" /> See this in</span>
      <select value={code} onChange={(e) => setCode(e.target.value)} className={selectClass}>
        {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.label}</option>)}
      </select>
      {loading ? (
        <Loader2 className={`h-3.5 w-3.5 animate-spin ${faint}`} />
      ) : converted != null ? (
        <span className={`font-medium ${strong}`}>≈ {currency.symbol}{converted.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
      ) : null}
      <span className={`w-full sm:w-auto ${faint} opacity-70`}>(indicative only — you're charged in INR)</span>
    </div>
  );
}
