/** All amounts are integers in paise. */
const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const fmt2 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function inr(paise: number): string {
  return fmt.format(Math.round(paise) / 100);
}
export function inrExact(paise: number): string {
  return fmt2.format(Math.round(paise) / 100);
}
export function discountPercent(price: number, compareAt?: number | null): number {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}
/** Parse a rupee string/number from a form into paise. */
export function rupeesToPaise(v: FormDataEntryValue | string | number | null | undefined): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}
