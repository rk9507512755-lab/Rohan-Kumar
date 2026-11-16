import type { Metadata } from "next";
import Link from "next/link";
import type { Coupon } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { inr } from "@/lib/money";
import { fmtDate } from "@/lib/utils";
import { Empty, PageHeader, Pill } from "../../_components/ui";

export const metadata: Metadata = { title: "Coupons" };

function state(c: Coupon, now: Date): [string, string] {
  if (!c.active) return ["Inactive", "neutral"];
  if (c.startsAt && c.startsAt > now) return ["Scheduled", "info"];
  if (c.endsAt && c.endsAt < now) return ["Expired", "bad"];
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) return ["Used up", "warn"];
  return ["Live", "good"];
}

export default async function CouponsPage() {
  await requireAdmin();
  const coupons = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });
  const now = new Date();
  return (
    <>
      <PageHeader
        title="Coupons"
        description="Discount codes customers can apply in the bag."
        actions={
          <Link href="/admin/coupons/new" className="btn-primary btn-sm">
            + New coupon
          </Link>
        }
      />
      {coupons.length === 0 ? (
        <Empty>No coupons yet.</Empty>
      ) : (
        <div className="admin-scroll border border-ink-200/70 bg-white">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Min. order</th>
                <th>Valid</th>
                <th className="text-right">Used</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => {
                const [label, tone] = state(c, now);
                return (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/admin/coupons/${c.id}`} className="font-mono font-medium text-wine hover:underline">
                        {c.code}
                      </Link>
                      {c.description && <div className="max-w-[260px] truncate text-xs text-ink-400">{c.description}</div>}
                    </td>
                    <td className="whitespace-nowrap">
                      {c.type === "PERCENT" ? `${c.value}% off` : `${inr(c.value)} off`}
                      {c.maxDiscount != null && <span className="block text-xs text-ink-400">up to {inr(c.maxDiscount)}</span>}
                    </td>
                    <td className="whitespace-nowrap">{c.minSubtotal ? inr(c.minSubtotal) : "—"}</td>
                    <td className="whitespace-nowrap text-xs text-ink-400">
                      {c.startsAt ? fmtDate(c.startsAt) : "Any time"} – {c.endsAt ? fmtDate(c.endsAt) : "no end"}
                    </td>
                    <td className="text-right tabular-nums">
                      {c.usedCount}
                      {c.usageLimit != null && <span className="text-ink-400"> / {c.usageLimit}</span>}
                    </td>
                    <td>
                      <Pill tone={tone}>{label}</Pill>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
