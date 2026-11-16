import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { categoryTree } from "../../_lib/categories";
import { ActionButton } from "../../_components/forms";
import { Empty, PageHeader, Pill, Thumb } from "../../_components/ui";
import { deleteCategory } from "./actions";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await requireAdmin();
  const [tree, counts] = await Promise.all([
    categoryTree(),
    db.category.findMany({ select: { id: true, image: true, showOnHome: true, sizeChart: true, _count: { select: { products: true, children: true } } } }),
  ]);
  const info = new Map(counts.map((c) => [c.id, c]));
  return (
    <>
      <PageHeader
        title="Categories"
        description="Collections shown in the store. Indentation shows the hierarchy."
        actions={
          <Link href="/admin/categories/new" className="btn-primary btn-sm">
            + New category
          </Link>
        }
      />
      {tree.length === 0 ? (
        <Empty>No categories yet.</Empty>
      ) : (
        <ul className="divide-y divide-ink-200/60 border border-ink-200/70 bg-white">
          {tree.map((c) => {
            const i = info.get(c.id)!;
            const empty = !i._count.products && !i._count.children;
            return (
              <li key={c.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 sm:px-4" style={{ paddingLeft: `${16 + c.depth * 28}px` }}>
                {c.depth > 0 && <span className="text-ink-300" aria-hidden>└</span>}
                <Thumb src={i.image} size={36} />
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/categories/${c.id}`} className={c.depth === 0 ? "font-medium hover:text-wine" : "hover:text-wine"}>
                    {c.name}
                  </Link>
                  <span className="ml-2 font-mono text-xs text-ink-300">/{c.slug}</span>
                </div>
                <span className="text-xs text-ink-400">
                  {i._count.products} product{i._count.products === 1 ? "" : "s"}
                </span>
                {i.showOnHome && <Pill tone="info">Home</Pill>}
                <span className="w-10 text-right text-xs text-ink-300" title="Sort order">
                  #{c.sortOrder}
                </span>
                <Link href={`/admin/categories/${c.id}`} className="admin-link">
                  Edit
                </Link>
                {empty ? (
                  <ActionButton action={deleteCategory.bind(null, c.id)} confirm={`Delete the "${c.name}" category?`} className="admin-danger">
                    Delete
                  </ActionButton>
                ) : (
                  <span className="text-sm text-ink-200" title="Only empty categories can be deleted">
                    Delete
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
