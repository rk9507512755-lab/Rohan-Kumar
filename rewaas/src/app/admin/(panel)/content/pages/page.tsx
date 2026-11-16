import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/utils";
import { Empty, PageHeader } from "../../../_components/ui";

export const metadata: Metadata = { title: "Pages" };

export default async function PagesPage() {
  await requireAdmin();
  const pages = await db.page.findMany({ orderBy: { title: "asc" } });
  return (
    <>
      <PageHeader
        title="Pages"
        description="Policy and information pages (About, Shipping, Returns, FAQs…)."
        actions={
          <Link href="/admin/content/pages/new" className="btn-primary btn-sm">
            + New page
          </Link>
        }
      />
      {pages.length === 0 ? (
        <Empty>No pages yet.</Empty>
      ) : (
        <div className="admin-scroll border border-ink-200/70 bg-white">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>URL</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/admin/content/pages/${p.id}`} className="font-medium hover:text-wine">
                      {p.title}
                    </Link>
                  </td>
                  <td className="font-mono text-xs text-ink-400">/pages/{p.slug}</td>
                  <td className="whitespace-nowrap text-ink-400">{fmtDate(p.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
