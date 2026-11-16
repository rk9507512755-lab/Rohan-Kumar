import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, VISITOR_COOKIE, verifySession } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Route protection
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const s = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
    if (!s || s.role !== "ADMIN") return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  if (pathname.startsWith("/account") && !["/account/login", "/account/register", "/account/forgot-password"].includes(pathname)) {
    const s = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
    if (!s) return NextResponse.redirect(new URL(`/account/login?next=${encodeURIComponent(pathname + search)}`, req.url));
  }

  // Anonymous visitor id for guest cart & wishlist (made visible to this same request too)
  if (!req.cookies.get(VISITOR_COOKIE)) {
    const vid = crypto.randomUUID();
    req.cookies.set(VISITOR_COOKIE, vid);
    const res = NextResponse.next({ request: { headers: req.headers } });
    res.cookies.set(VISITOR_COOKIE, vid, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 180, secure: process.env.NODE_ENV === "production" });
    return res;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|images/|api/media|favicon|robots.txt|sitemap.xml).*)"],
};
