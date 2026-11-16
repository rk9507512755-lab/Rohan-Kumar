import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { inr } from "@/lib/money";
import { Section } from "../../_components/fields";
import { ActivePill, Empty, PageHeader, Thumb } from "../../_components/ui";

export const metadata: Metadata = { title: "Gift Studio" };

const LOW = 10;

function Stock({ n }: { n: number }) {
  return <span className={n === 0 ? "font-medium text-wine-700" : n <= LOW ? "font-medium text-amber-700" : ""}>{n}{n <= LOW && <span className="ml-1 text-xs">{n === 0 ? "out" : "low"}</span>}</span>;
}

export default async function GiftStudioPage() {
  await requireAdmin();
  const [boxes, comps, packs, hampersCat] = await Promise.all([
    db.hamperBox.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.hamperComponent.findMany({ orderBy: [{ group: "asc" }, { sortOrder: "asc" }, { name: "asc" }] }),
    db.packagingOption.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.category.findUnique({ where: { slug: "gift-hampers" }, include: { _count: { select: { products: true } }, children: { select: { id: true } } } }),
  ]);
  const low = boxes.filter((b) => b.stock <= LOW).length + comps.filter((c) => c.stock <= LOW).length;
  const newBtn = (kind: string, label: string) => (
    <Link href={`/admin/gift-studio/${kind}/new`} className="btn-outline btn-sm">
      + {label}
    </Link>
  );
  const premadeHref = hampersCat ? `/admin/products?category=${hampersCat.id}` : "/admin/products";

  return (
    <>
      <PageHeader title="Gift Studio" description="Build-your-own hamper: boxes, items to fill them with and packaging." actions={<Link href={premadeHref} className="btn-primary btn-sm">Pre-made hampers →</Link>} />
      <p className="mb-4 text-sm text-ink-400">
        Pre-made hampers are regular products in the{" "}
        <Link href={premadeHref} className="admin-link">
          Gift Hampers category
        </Link>
        {hampersCat ? ` (${hampersCat._count.products} directly, plus ${hampersCat.children.length} sub-categories)` : ""}.
      </p>
      {low > 0 && <p className="mb-4 border-l-2 border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-900">{low} box{low === 1 ? "" : "es"}/item{low === 1 ? "" : "s"} at or below {LOW} in stock.</p>}

      <div className="space-y-4">
        <Section title={`Hamper boxes (${boxes.length})`} actions={newBtn("box", "New box")}>
          {boxes.length === 0 ? (
            <Empty>No boxes yet.</Empty>
          ) : (
            <div className="admin-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Box</th>
                    <th className="text-right">Price</th>
                    <th className="text-right">Capacity</th>
                    <th className="text-right">Stock</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {boxes.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <Link href={`/admin/gift-studio/box/${b.id}`} className="flex items-center gap-3 hover:text-wine">
                          <Thumb src={b.image} size={44} />
                          <span>
                            <span className="font-medium">{b.name}</span>
                            {b.dimensions && <span className="block text-xs text-ink-400">{b.dimensions}</span>}
                          </span>
                        </Link>
                      </td>
                      <td className="text-right tabular-nums">{inr(b.price)}</td>
                      <td className="text-right tabular-nums">{b.capacity} items</td>
                      <td className="text-right tabular-nums">
                        <Stock n={b.stock} />
                      </td>
                      <td>
                        <ActivePill active={b.active} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title={`Hamper items (${comps.length})`} actions={newBtn("component", "New item")}>
          {comps.length === 0 ? (
            <Empty>No items yet.</Empty>
          ) : (
            <div className="admin-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Group</th>
                    <th className="text-right">Price</th>
                    <th className="text-right">Max / hamper</th>
                    <th className="text-right">Stock</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {comps.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/admin/gift-studio/component/${c.id}`} className="flex items-center gap-3 font-medium hover:text-wine">
                          <Thumb src={c.image} size={40} />
                          {c.name}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap text-ink-400">{c.group}</td>
                      <td className="text-right tabular-nums">{inr(c.price)}</td>
                      <td className="text-right tabular-nums">{c.maxPerHamper}</td>
                      <td className="text-right tabular-nums">
                        <Stock n={c.stock} />
                      </td>
                      <td>
                        <ActivePill active={c.active} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title={`Packaging options (${packs.length})`} actions={newBtn("packaging", "New packaging")}>
          {packs.length === 0 ? (
            <Empty>No packaging options yet.</Empty>
          ) : (
            <ul className="divide-y divide-ink-200/60">
              {packs.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2.5">
                  <Thumb src={p.image} size={40} />
                  <Link href={`/admin/gift-studio/packaging/${p.id}`} className="min-w-0 flex-1 hover:text-wine">
                    <span className="font-medium">{p.name}</span>
                    <span className="block truncate text-xs text-ink-400">{p.description}</span>
                  </Link>
                  <span className="text-sm tabular-nums">{p.price ? inr(p.price) : "Free"}</span>
                  <ActivePill active={p.active} />
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}
