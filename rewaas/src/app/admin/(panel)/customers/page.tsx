import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { inr } from "@/lib/money";
import { fmtDate } from "@/lib/utils";
import { PER_PAGE } from "../../_lib/constants";
import { one, pageNum, type SP } from "../../_lib/query";
import { Empty, Filters, PageHeader, Pagination, Pill } from "../../_components/ui";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = one(sp.q);
  const role = one(sp.role);
  const page = pageNum(sp.page);
  const where: Prisma.UserWhereInput = {
    ...(role === "ADMIN" || role === "CUSTOMER" ? { role } : {}),
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        ...(q.replace(/\D/g, "").length >= 4 ? [{ phone: { contains: q.replace(/\D/g, "").slice(-10) } }] : []),
      ],
    }),
  };
  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, include: { _count: { select: { orders: true } } } }),
  ]);
  const spent = await db.order.groupBy({
    by: ["userId"],
    where: { userId: { in: users.map((u) => u.id) }, paymentStatus: "PAID", status: { not: "CANCELLED" } },
    _sum: { total: true },
  });
  const spentBy = new Map(spent.map((s) => [s.userId, s._sum.total ?? 0]));
  return (
    <>
      <PageHeader title="Customers" description={`${total} account${total === 1 ? "" : "s"}`} />
      <Filters action="/admin/customers" reset={Boolean(q || role)}>
        <div className="min-w-[220px] flex-1">
          <label className="field-label" htmlFor="q">
            Search
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Name, email or phone" className="field" />
        </div>
        <div>
          <label className="field-label" htmlFor="role">
            Role
          </label>
          <select id="role" name="role" defaultValue={role} className="field">
            <option value="">All</option>
            <option value="CUSTOMER">Customers</option>
            <option value="ADMIN">Admins</option>
          </select>
        </div>
      </Filters>
      {users.length === 0 ? (
        <Empty>No customers found.</Empty>
      ) : (
        <div className="admin-scroll border border-ink-200/70 bg-white">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th className="text-right">Orders</th>
                <th className="text-right">Total spent</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <Link href={`/admin/customers/${u.id}`} className="font-medium hover:text-wine">
                      {u.name}
                    </Link>{" "}
                    {u.role === "ADMIN" && <Pill tone="info">Admin</Pill>}
                    <div className="text-xs text-ink-400">{u.email}</div>
                  </td>
                  <td className="whitespace-nowrap text-ink-400">{u.phone ?? "—"}</td>
                  <td className="text-right tabular-nums">{u._count.orders}</td>
                  <td className="text-right tabular-nums">{inr(spentBy.get(u.id) ?? 0)}</td>
                  <td className="whitespace-nowrap text-ink-400">{fmtDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} total={total} perPage={PER_PAGE} base="/admin/customers" params={{ q, role }} />
    </>
  );
}
