import "server-only";
import { cookies } from "next/headers";
import { VISITOR_COOKIE } from "./session";
import { getSession } from "./auth";

/** Identity used for cart & wishlist: logged-in user id, or the anonymous visitor cookie set by middleware. */
export async function getOwner(): Promise<{ userId?: string; visitorId?: string }> {
  const s = await getSession();
  if (s) return { userId: s.uid };
  const vid = (await cookies()).get(VISITOR_COOKIE)?.value;
  return vid ? { visitorId: vid } : {};
}
