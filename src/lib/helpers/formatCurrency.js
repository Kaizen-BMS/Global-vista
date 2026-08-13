/** Plain amount + currency code formatting shared by payment UI and
 * receipts — deliberately not using Intl.NumberFormat's currency style,
 * since that forces a locale-specific symbol guess; showing the ISO code
 * next to a plain grouped number ("INR 1,20,000.00") is unambiguous
 * regardless of which currency a company configures. */
export function formatMoney(amount, currency = "INR") {
  const n = Number(amount || 0);
  const formatted = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  return `${currency} ${formatted}`;
}
