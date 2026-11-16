import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/utils";
import { one, pageNum, type SP } from "../../../_lib/query";
import { Empty, Filters, PageHeader, Pagination } from "../../../_components/ui";

export const metadata: Metadata = { title: "Newsletter" };
const PER = 50;

export default async function NewsletterPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = one(sp.q);
  const page = pageNum(sp.page);
  const where: Prisma.NewsletterSubscriberWhereInput = q ? { email: { contains: q, mode: "insensitive" } } : {};
  const [total, subs] = await Promise.all([
    db.newsletterSubscriber.count({ where }),
    db.newsletterSubscriber.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER }),
  ]);
  return (
    <>
      <PageHeader
        title="Newsletter"
        description={`${total} subscriber${total === 1 ? "" : "s"}`}
        actions={
          <a href="/api/admin/newsletter" className="btn-primary btn-sm" download>
            Export CSV
          </a>
        }
      />
      <Filters action="/admin/content/newsletter" reset={Boolean(q)}>
        <div className="min-w-[220px] flex-1">
          <label className="field-label" htmlFor="q">
            Search
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Email" className="field" />
        </div>
      </Filters>
      {subs.length === 0 ? (
        <Empty>No subscribers{q ? " match" : " yet"}.</Empty>
      ) : (
        <div className="admin-scroll border border-ink-200/70 bg-white">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Source</th>
                <th>Subscribed</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id}>
                  <td>{s.email}</td>
                  <td className="text-ink-400">{s.source ?? "—"}</td>
                  <td className="whitespace-nowrap text-ink-400">{fmtDate(s.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} total={total} perPage={PER} base="/admin/content/newsletter" params={{ q }} />
    </>
  );
}
