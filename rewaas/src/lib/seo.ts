export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
export const SITE_NAME = "REWAAS";
export const DEFAULT_DESCRIPTION =
  "REWAAS — premium Indian ethnic wear, contemporary fashion and luxury gifting. Handcrafted sarees, suits, lehengas, kurtis, bridal edits and curated gift hampers.";

export function absUrl(p: string) {
  if (/^https?:\/\//.test(p)) return p;
  return `${SITE_URL}${p.startsWith("/") ? "" : "/"}${p}`;
}

export function jsonLd(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
