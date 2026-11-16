import "server-only";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { SESSION_COOKIE, SESSION_MAX_AGE, VISITOR_COOKIE, signSession, verifySession, type SessionPayload } from "./session";

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 12);
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

export async function getCurrentUser() {
  const s = await getSession();
  if (!s) return null;
  return db.user.findUnique({
    where: { id: s.uid },
    select: { id: true, email: true, name: true, phone: true, role: true, preferredPayment: true, marketingOptIn: true, createdAt: true },
  });
}

export async function requireUser(next = "/account") {
  const u = await getCurrentUser();
  if (!u) redirect(`/account/login?next=${encodeURIComponent(next)}`);
  return u;
}

export async function requireAdmin() {
  const u = await getCurrentUser();
  if (!u || u.role !== "ADMIN") redirect("/admin/login");
  return u;
}

/** Call only from server actions / route handlers. */
export async function startSession(user: { id: string; role: "CUSTOMER" | "ADMIN"; name: string }) {
  const token = await signSession({ uid: user.id, role: user.role, name: user.name });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  await mergeVisitorData(user.id, store.get(VISITOR_COOKIE)?.value);
}

export async function endSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Move a guest's cart & wishlist onto their account after login/registration. */
async function mergeVisitorData(userId: string, visitorId?: string) {
  if (!visitorId) return;
  const guestCart = await db.cart.findUnique({ where: { visitorId }, include: { items: true } });
  if (guestCart && guestCart.items.length) {
    let userCart = await db.cart.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" } });
    if (!userCart) userCart = await db.cart.create({ data: { userId } });
    for (const it of guestCart.items) {
      const existing =
        it.kind === "PRODUCT" && it.variantId
          ? await db.cartItem.findFirst({ where: { cartId: userCart.id, variantId: it.variantId } })
          : null;
      if (existing) await db.cartItem.update({ where: { id: existing.id }, data: { quantity: Math.min(10, existing.quantity + it.quantity) } });
      else await db.cartItem.update({ where: { id: it.id }, data: { cartId: userCart.id } });
    }
    if (guestCart.couponCode && !userCart.couponCode) await db.cart.update({ where: { id: userCart.id }, data: { couponCode: guestCart.couponCode } });
    await db.cart.delete({ where: { id: guestCart.id } });
  }
  const wish = await db.wishlistItem.findMany({ where: { visitorId } });
  for (const w of wish) {
    await db.wishlistItem.upsert({
      where: { userId_productId: { userId, productId: w.productId } },
      create: { userId, productId: w.productId },
      update: {},
    });
  }
  await db.wishlistItem.deleteMany({ where: { visitorId } });
}

/** Very small in-memory rate limiter for auth endpoints (per server instance). */
const attempts = new Map<string, { n: number; at: number }>();
export function rateLimit(key: string, max = 8, windowMs = 10 * 60 * 1000): boolean {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || now - rec.at > windowMs) {
    attempts.set(key, { n: 1, at: now });
    return true;
  }
  rec.n += 1;
  return rec.n <= max;
}
