import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ActivePill, Empty, PageHeader, Thumb } from "../../../_components/ui";

export const metadata: Metadata = { title: "Testimonials" };

export default async function TestimonialsPage() {
  await requireAdmin();
  const list = await db.testimonial.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
  return (
    <>
      <PageHeader
        title="Testimonials"
        description="Customer love shown on the home page."
        actions={
          <Link href="/admin/content/testimonials/new" className="btn-primary btn-sm">
            + New testimonial
          </Link>
        }
      />
      {list.length === 0 ? (
        <Empty>No testimonials yet.</Empty>
      ) : (
        <ul className="divide-y divide-ink-200/60 border border-ink-200/70 bg-white">
          {list.map((t) => (
            <li key={t.id}>
              <Link href={`/admin/content/testimonials/${t.id}`} className="flex items-start gap-4 p-4 hover:bg-ivory-50">
                <Thumb src={t.image} size={52} className="rounded-full" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {t.name}
                    {t.city && <span className="font-normal text-ink-400"> · {t.city}</span>}
                    <span className="ml-2 text-gold" aria-label={`${t.rating} out of 5`}>
                      {"★".repeat(t.rating)}
                      <span className="text-ink-200">{"★".repeat(5 - t.rating)}</span>
                    </span>
                  </p>
                  <p className="line-clamp-2 text-sm text-ink/80">“{t.text}”</p>
                  <p className="mt-1 text-xs text-ink-400">on {t.productName}</p>
                </div>
                <ActivePill active={t.active} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
