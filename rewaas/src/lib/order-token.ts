import "server-only";
import crypto from "crypto";

// Lets guests open their own confirmation page without an account: /order/RWXXXX?t=<token>
export function orderToken(number: string) {
  return crypto.createHmac("sha256", process.env.AUTH_SECRET || "insecure-development-secret-please-set-AUTH_SECRET").update(`order:${number}`).digest("hex").slice(0, 24);
}
export function checkOrderToken(number: string, token?: string | null) {
  if (!token) return false;
  const a = Buffer.from(orderToken(number));
  const b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
