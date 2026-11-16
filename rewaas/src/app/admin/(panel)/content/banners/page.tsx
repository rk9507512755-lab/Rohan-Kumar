import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ActivePill, Empty, PageHeader, Pill, Thumb } from "../../../_components/ui";

export const metadata: Metadata = { title: "Banners" };

export default async function BannersPage() {
  await requireAdmin();
  const banners = await db.banner.findMany({ orderBy: [{ placement: "asc" }, { sortOrder: "asc" }] });
  return (
    <>
      <PageHeader
        title="Banners"
        description="Hero slides at the top of the home page and featured banners further down."
        actions={
          <Link href="/admin/content/banners/new" className="btn-primary btn-sm">
            + New banner
          </Link>
        }
      />
      {banners.length === 0 ? (
        <Empty>No banners yet.</Empty>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {banners.map((b) => (
            <li key={b.id}>
              <Link href={`/admin/content/banners/${b.id}`} className="admin-card block !p-0 transition hover:border-wine/40">
                <Thumb src={b.desktopImage} size={600} className="!h-40 !w-full" />
                <div className="p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Pill tone="info">{b.placement === "hero" ? "Hero" : "Featured"}</Pill>
                    <ActivePill active={b.active} />
                    <span className="text-xs text-ink-300">#{b.sortOrder}</span>
                  </div>
                  {b.eyebrow && <p className="eyebrow">{b.eyebrow}</p>}
                  <p className="font-display text-xl leading-tight">{b.title}</p>
                  {b.subtitle && <p className="mt-1 line-clamp-2 text-sm text-ink-400">{b.subtitle}</p>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
