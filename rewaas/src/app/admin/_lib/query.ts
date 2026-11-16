export type SP = Promise<Record<string, string | string[] | undefined>>;

export function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}
export function pageNum(v: string | string[] | undefined): number {
  const n = parseInt(one(v), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}
/** Build a query string, dropping empty values. */
export function qs(params: Record<string, string | number | undefined | null>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") u.set(k, String(v));
  const s = u.toString();
  return s ? `?${s}` : "";
}
