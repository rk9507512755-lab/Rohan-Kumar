import type { Metadata } from "next";
import Link from "next/link";
import type { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { inr } from "@/lib/money";
import { STATUS_LABEL } from "@/lib/orders";
import { fmtDate } from "@/lib/utils";
import { PER_PAGE } from "../../_lib/constants";
import { one, pageNum, type SP } from "../../_lib/query";
import { Empty, Filters, OrderStatusPill, PageHeader, Pagination, PaymentPill } from "../../_components/ui";

export const metadata: Metadata = { title: "Orders" };

const STATUSES = Object.keys(STATUS_LABEL) as OrderStatus[];
const PAYMENTS: PaymentStatus[] = ["PENDING", "PAID", "FAILED", "REFUNDED"];

function day(s: string, end = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  const d = new Date(`${s}T00:00:00`);
  if (end) d.setDate(d.getDate() + 1);
  return d;
}

export default async function OrdersPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = one(sp.q);
  const status = one(sp.status);
  const payment = one(sp.payment);
  const from = one(sp.from);
  const to = one(sp.to);
  const page = pageNum(sp.page);
  const digits = q.replace(/\D/g, "");

  const where: Prisma.OrderWhereInput = {
    ...(STATUSES.includes(status as OrderStatus) && { status: status as OrderStatus }),
    ...(PAYMENTS.includes(payment as PaymentStatus) && { paymentStatus: payment as PaymentStatus }),
    ...((day(from) || day(to, true)) && { createdAt: { ...(day(from) && { gte: day(from) }), ...(day(to, true) && { lt: day(to, true) }) } }),
    ...(q && {
      OR: [
        { number: { contains: q.toUpperCase().replace(/^#/, "") } },
        { email: { contains: q, mode: "insensitive" } },
        ...(digits.length >= 4 ? [{ phone: { contains: digits.slice(-10) } }] : []),
      ],
    }),
  };
  const [total, orders] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, include: { _count: { select: { items: true } } } }),
  ]);
  const filtered = Boolean(q || status || payment || from || to);

  return (
    <>
      <PageHeader title="Orders" description={`${total} order${total === 1 ? "" : "s"}${filtered ? " match" : ""}`} />
      <Filters action="/admin/orders" reset={filtered}>
        <div className="min-w-[200px] flex-1">
          <label className="field-label" htmlFor="q">
            Search
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Order no., email or phone" className="field" />
        </div>
        <div>
          <label className="field-label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" defaultValue={status} className="field">
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="payment">
            Payment
          </label>
          <select id="payment" name="payment" defaultValue={payment} className="field">
            <option value="">All</option>
            {PAYMENTS.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="from">
            From
          </label>
          <input id="from" type="date" name="from" defaultValue={from} className="field" />
        </div>
        <div>
          <label className="field-label" htmlFor="to">
            To
          </label>
          <input id="to" type="date" name="to" defaultValue={to} className="field" />
        </div>
      </Filters>
      {orders.length === 0 ? (
        <Empty>No orders found.</Empty>
      ) : (
        <div className="admin-scroll border border-ink-200/70 bg-white">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Payment</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const addr = o.shippingAddress as { name?: string; city?: string } | null;
                return (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/admin/orders/${o.id}`} className="font-medium text-wine hover:underline">
                        {o.number}
                      </Link>
                      <div className="text-xs text-ink-400">
                        {o._count.items} item{o._count.items === 1 ? "" : "s"}
                      </div>
                    </td>
                    <td className="whitespace-nowrap text-ink-400">{fmtDate(o.createdAt)}</td>
                    <td>
                      <div className="max-w-[220px] truncate">{addr?.name ?? "—"}</div>
                      <div className="max-w-[220px] truncate text-xs text-ink-400">{o.email}</div>
                    </td>
                    <td>
                      <OrderStatusPill status={o.status} />
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <PaymentPill status={o.paymentStatus} />
                        <span className="text-xs text-ink-400">{o.paymentMethod === "COD" ? "COD" : "Online"}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap text-right tabular-nums">{inr(o.total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} total={total} perPage={PER_PAGE} base="/admin/orders" params={{ q, status, payment, from, to }} />
    </>
  );
}
