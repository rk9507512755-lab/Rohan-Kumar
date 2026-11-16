import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma, ReturnStatus, ReturnType } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/utils";
import { PER_PAGE } from "../../_lib/constants";
import { one, pageNum, type SP } from "../../_lib/query";
import { Empty, Filters, PageHeader, Pagination, Pill, ReturnPill } from "../../_components/ui";

export const metadata: Metadata = { title: "Returns & exchanges" };

const STATUSES: ReturnStatus[] = ["REQUESTED", "APPROVED", "PICKED_UP", "COMPLETED", "REJECTED"];

export default async function ReturnsPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const status = one(sp.status);
  const type = one(sp.type);
  const q = one(sp.q);
  const page = pageNum(sp.page);
  const where: Prisma.ReturnRequestWhereInput = {
    ...(STATUSES.includes(status as ReturnStatus) && { status: status as ReturnStatus }),
    ...((type === "RETURN" || type === "EXCHANGE") && { type: type as ReturnType }),
    ...(q && { OR: [{ order: { number: { contains: q.toUpperCase() } } }, { order: { email: { contains: q, mode: "insensitive" } } }] }),
  };
  const [total, rows] = await Promise.all([
    db.returnRequest.count({ where }),
    db.returnRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { order: { select: { number: true, email: true, shippingAddress: true } }, orderItem: { select: { name: true, size: true } } },
    }),
  ]);
  return (
    <>
      <PageHeader title="Returns & exchanges" description={`${total} request${total === 1 ? "" : "s"}`} />
      <Filters action="/admin/returns" reset={Boolean(status || type || q)}>
        <div className="min-w-[180px] flex-1">
          <label className="field-label" htmlFor="q">
            Search
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Order no. or email" className="field" />
        </div>
        <div>
          <label className="field-label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" defaultValue={status} className="field">
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "PICKED_UP" ? "Picked up" : s.charAt(0) + s.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="type">
            Type
          </label>
          <select id="type" name="type" defaultValue={type} className="field">
            <option value="">All</option>
            <option value="RETURN">Return</option>
            <option value="EXCHANGE">Exchange</option>
          </select>
        </div>
      </Filters>
      {rows.length === 0 ? (
        <Empty>No return or exchange requests{status || type || q ? " match these filters" : " yet"}.</Empty>
      ) : (
        <div className="admin-scroll border border-ink-200/70 bg-white">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Requested</th>
                <th>Order</th>
                <th>Type</th>
                <th>Item</th>
                <th>Reason</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap">
                    <Link href={`/admin/returns/${r.id}`} className="text-wine hover:underline">
                      {fmtDate(r.createdAt)}
                    </Link>
                  </td>
                  <td>
                    {r.order.number}
                    <div className="text-xs text-ink-400">{(r.order.shippingAddress as { name?: string } | null)?.name ?? r.order.email}</div>
                  </td>
                  <td>
                    <Pill tone={r.type === "RETURN" ? "neutral" : "info"}>{r.type === "RETURN" ? "Return" : "Exchange"}</Pill>
                  </td>
                  <td className="max-w-[220px] truncate">{r.orderItem ? `${r.orderItem.name}${r.orderItem.size ? ` (${r.orderItem.size})` : ""}` : "Whole order"}</td>
                  <td className="max-w-[220px] truncate text-ink-400">{r.reason}</td>
                  <td>
                    <ReturnPill status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} total={total} perPage={PER_PAGE} base="/admin/returns" params={{ status, type, q }} />
    </>
  );
}
