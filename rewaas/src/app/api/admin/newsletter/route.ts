import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Quote a CSV cell; neutralise spreadsheet formula injection. */
function cell(v: string) {
  const s = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return new Response("Forbidden", { status: 403 });
  const subs = await db.newsletterSubscriber.findMany({ orderBy: { createdAt: "desc" } });
  const rows = [["email", "source", "subscribed_at"], ...subs.map((s) => [s.email, s.source ?? "", s.createdAt.toISOString()])];
  const csv = "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rewaas-newsletter-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
