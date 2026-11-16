import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { inr } from "@/lib/money";
import { fmtDate } from "@/lib/utils";
import BarChart from "../_components/BarChart";
import { Section } from "../_components/fields";
import { Empty, OrderStatusPill, PageHeader, PaymentPill, Stat, Thumb } from "../_components/ui";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const PAID_WHERE = { paymentStatus: "PAID" as const, status: { not: "CANCELLED" as const } };

function lastMonths(n: number) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("en-IN", { month: "short" }), start: d };
  });
}
const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;

export default async function DashboardPage() {
  const admin = await requireAdmin();
  const months = lastMonths(6);
  const since = months[0].start;
  const monthStart = months[months.length - 1].start;

  const [revenueAgg, totalOrders, customers, newCustomers, paidSince, custSince, best, recent, lowVariants, lowBoxes, lowComps, pendingReturns, openReturns] =
    await Promise.all([
      db.order.aggregate({ where: PAID_WHERE, _sum: { total: true }, _count: true }),
      db.order.count({ where: { status: { not: "PENDING_PAYMENT" } } }),
      db.user.count({ where: { role: "CUSTOMER" } }),
      db.user.count({ where: { role: "CUSTOMER", createdAt: { gte: monthStart } } }),
      db.order.findMany({ where: { ...PAID_WHERE, createdAt: { gte: since } }, select: { total: true, createdAt: true } }),
      db.user.findMany({ where: { role: "CUSTOMER", createdAt: { gte: since } }, select: { createdAt: true } }),
      db.orderItem.groupBy({
        by: ["productId"],
        where: { productId: { not: null }, order: { status: { notIn: ["CANCELLED", "PENDING_PAYMENT"] } } },
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 6,
      }),
      db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { id: true, number: true, email: true, total: true, status: true, paymentStatus: true, createdAt: true, shippingAddress: true } }),
      db.variant.findMany({ where: { stock: { lte: 3 }, product: { status: { not: "ARCHIVED" } } }, orderBy: { stock: "asc" }, take: 30, include: { product: { select: { id: true, name: true } } } }),
      db.hamperBox.findMany({ where: { stock: { lte: 10 } }, orderBy: { stock: "asc" } }),
      db.hamperComponent.findMany({ where: { stock: { lte: 10 } }, orderBy: { stock: "asc" } }),
      db.returnRequest.count({ where: { status: "REQUESTED" } }),
      db.returnRequest.count({ where: { status: { in: ["APPROVED", "PICKED_UP"] } } }),
    ]);

  const revenue = revenueAgg._sum.total ?? 0;
  const paidCount = revenueAgg._count;
  const aov = paidCount ? Math.round(revenue / paidCount) : 0;

  const revByMonth = months.map((m) => ({ label: m.label, value: paidSince.filter((o) => monthKey(o.createdAt) === m.key).reduce((a, o) => a + o.total, 0) }));
  const custByMonth = months.map((m) => ({ label: m.label, value: custSince.filter((u) => monthKey(u.createdAt) === m.key).length }));

  const bestProducts = await db.product.findMany({
    where: { id: { in: best.map((b) => b.productId!) } },
    select: { id: true, name: true, images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } } },
  });
  const lowCount = lowVariants.length + lowBoxes.length + lowComps.length;

  return (
    <>
      <PageHeader eyebrow={fmtDate(new Date(), { weekday: "long", day: "numeric", month: "long" })} title={`Namaste, ${admin.name.split(" ")[0]}`} description="Here is how the store is doing." />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Revenue" value={inr(revenue)} sub={`${paidCount} paid orders`} />
        <Stat label="Orders" value={totalOrders.toLocaleString("en-IN")} sub="Placed (excl. unpaid)" href="/admin/orders" />
        <Stat label="Avg. order value" value={inr(aov)} sub="Paid orders" />
        <Stat label="Customers" value={customers.toLocaleString("en-IN")} sub={`+${newCustomers} this month`} href="/admin/customers" />
      </div>

      {(pendingReturns > 0 || lowCount > 0) && (
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          {pendingReturns > 0 && (
            <Link href="/admin/returns?status=REQUESTED" className="border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900 hover:border-amber-400">
              {pendingReturns} return request{pendingReturns === 1 ? "" : "s"} awaiting review{openReturns ? ` · ${openReturns} in progress` : ""} →
            </Link>
          )}
          {lowCount > 0 && (
            <a href="#inventory" className="border border-wine-100 bg-wine-50 px-3 py-2 text-wine-700 hover:border-wine-200">
              {lowCount} low-stock item{lowCount === 1 ? "" : "s"} →
            </a>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Section title="Revenue by month" description="Paid orders, last 6 months">
          <BarChart title="Revenue by month, last 6 months" data={revByMonth} format={(n) => (n >= 10000000 ? `₹${(n / 10000000).toFixed(1)}L` : n >= 100000 ? `₹${Math.round(n / 100000)}k` : inr(n))} />
        </Section>
        <Section title="Customer growth" description="New sign-ups per month">
          <BarChart title="New customers by month, last 6 months" data={custByMonth} />
        </Section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Section title="Recent orders" className="lg:col-span-3" actions={<Link href="/admin/orders" className="admin-link">All orders →</Link>}>
          {recent.length === 0 ? (
            <Empty>No orders yet.</Empty>
          ) : (
            <div className="admin-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <Link href={`/admin/orders/${o.id}`} className="font-medium text-wine hover:underline">
                          {o.number}
                        </Link>
                        <div className="text-xs text-ink-400">{fmtDate(o.createdAt)}</div>
                      </td>
                      <td className="max-w-[180px] truncate">{(o.shippingAddress as { name?: string } | null)?.name ?? o.email}</td>
                      <td>
                        <div className="flex flex-col items-start gap-1">
                          <OrderStatusPill status={o.status} />
                          <PaymentPill status={o.paymentStatus} />
                        </div>
                      </td>
                      <td className="text-right tabular-nums">{inr(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
        <Section title="Best sellers" description="By units sold" className="lg:col-span-2">
          {best.length === 0 ? (
            <Empty>No sales yet.</Empty>
          ) : (
            <ol className="space-y-3">
              {best.map((b, i) => {
                const p = bestProducts.find((x) => x.id === b.productId);
                return (
                  <li key={b.productId} className="flex items-center gap-3">
                    <span className="w-4 text-xs text-ink-300">{i + 1}</span>
                    <Thumb src={p?.images[0]?.url} size={40} />
                    <div className="min-w-0 flex-1">
                      {p ? (
                        <Link href={`/admin/products/${p.id}`} className="block truncate text-sm hover:text-wine">
                          {p.name}
                        </Link>
                      ) : (
                        <span className="text-sm text-ink-400">Deleted product</span>
                      )}
                      <span className="text-xs text-ink-400">{inr(b._sum.total ?? 0)} gross</span>
                    </div>
                    <span className="text-sm tabular-nums">{b._sum.quantity} sold</span>
                  </li>
                );
              })}
            </ol>
          )}
        </Section>
      </div>

      <Section title="Inventory alerts" description="Variants with 3 or fewer in stock; hamper boxes and components with 10 or fewer" className="mt-4 scroll-mt-20" >
        <div id="inventory" />
        {lowCount === 0 ? (
          <p className="text-sm text-ink-400">All stock levels look healthy.</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 font-sans text-xs uppercase tracking-[0.14em] text-ink-400">Product variants ({lowVariants.length})</h3>
              <ul className="divide-y divide-ink-200/60 text-sm">
                {lowVariants.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-3 py-2">
                    <Link href={`/admin/products/${v.product.id}#variants`} className="min-w-0 truncate hover:text-wine">
                      {v.product.name} <span className="text-ink-400">· {v.size} / {v.colour}</span>
                    </Link>
                    <StockTag n={v.stock} />
                  </li>
                ))}
                {lowVariants.length === 0 && <li className="py-2 text-ink-400">None</li>}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 font-sans text-xs uppercase tracking-[0.14em] text-ink-400">Gift Studio ({lowBoxes.length + lowComps.length})</h3>
              <ul className="divide-y divide-ink-200/60 text-sm">
                {lowBoxes.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3 py-2">
                    <Link href={`/admin/gift-studio/box/${b.id}`} className="truncate hover:text-wine">
                      {b.name} <span className="text-ink-400">· box</span>
                    </Link>
                    <StockTag n={b.stock} />
                  </li>
                ))}
                {lowComps.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                    <Link href={`/admin/gift-studio/component/${c.id}`} className="truncate hover:text-wine">
                      {c.name} <span className="text-ink-400">· {c.group}</span>
                    </Link>
                    <StockTag n={c.stock} />
                  </li>
                ))}
                {lowBoxes.length + lowComps.length === 0 && <li className="py-2 text-ink-400">None</li>}
              </ul>
            </div>
          </div>
        )}
      </Section>
    </>
  );
}

function StockTag({ n }: { n: number }) {
  return <span className={n === 0 ? "whitespace-nowrap text-xs font-medium text-wine-700" : "whitespace-nowrap text-xs text-amber-700"}>{n === 0 ? "Out of stock" : `${n} left`}</span>;
}
