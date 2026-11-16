import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma, ProductStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { inr } from "@/lib/money";
import { categoryTree } from "../../_lib/categories";
import { PER_PAGE } from "../../_lib/constants";
import { one, pageNum, type SP } from "../../_lib/query";
import { Empty, Filters, PageHeader, Pagination, Pill, Thumb } from "../../_components/ui";

export const metadata: Metadata = { title: "Products" };

const STATUSES: ProductStatus[] = ["ACTIVE", "DRAFT", "ARCHIVED"];

export default async function ProductsPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = one(sp.q);
  const category = one(sp.category);
  const status = one(sp.status);
  const page = pageNum(sp.page);

  const cats = await categoryTree();
  // include descendants of the chosen category
  const catIds = category ? [category, ...descendants(cats, category)] : [];
  const where: Prisma.ProductWhereInput = {
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
        { variants: { some: { sku: { contains: q, mode: "insensitive" } } } },
      ],
    }),
    ...(category && { categoryId: { in: catIds } }),
    ...(STATUSES.includes(status as ProductStatus) && { status: status as ProductStatus }),
  };
  const [total, products] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { category: { select: { name: true } }, images: { orderBy: { sortOrder: "asc" }, take: 1 }, variants: { select: { stock: true } } },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Products"
        description={`${total} product${total === 1 ? "" : "s"}`}
        actions={
          <Link href="/admin/products/new" className="btn-primary btn-sm">
            + New product
          </Link>
        }
      />
      {one(sp.deleted) && <p className="mb-4 border-l-2 border-emerald-600 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Product deleted.</p>}
      {one(sp.archived) && <p className="mb-4 border-l-2 border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-900">This product has orders, so it was archived instead of deleted.</p>}
      <Filters action="/admin/products" reset={Boolean(q || category || status)}>
        <div className="min-w-[200px] flex-1">
          <label className="field-label" htmlFor="q">
            Search
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Name, slug or SKU" className="field" />
        </div>
        <div>
          <label className="field-label" htmlFor="category">
            Category
          </label>
          <select id="category" name="category" defaultValue={category} className="field max-w-[260px]">
            <option value="">All categories</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.path}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" defaultValue={status} className="field">
            <option value="">Any status</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
      </Filters>

      {products.length === 0 ? (
        <Empty>No products match these filters.</Empty>
      ) : (
        <div className="admin-scroll border border-ink-200/70 bg-white">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Status</th>
                <th className="text-right">Price</th>
                <th className="text-right">Stock</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const stock = p.variants.reduce((a, v) => a + v.stock, 0);
                return (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                        <Thumb src={p.images[0]?.url} alt="" size={48} />
                        <span className="min-w-0">
                          <span className="block max-w-[320px] truncate font-medium hover:text-wine">{p.name}</span>
                          <span className="block text-xs text-ink-400">
                            {p.variants.length} variant{p.variants.length === 1 ? "" : "s"}
                            {p.isBestseller && " · Bestseller"}
                            {p.isNew && " · New"}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="whitespace-nowrap text-ink-400">{p.category.name}</td>
                    <td>
                      <Pill tone={p.status === "ACTIVE" ? "good" : p.status === "DRAFT" ? "warn" : "neutral"}>{p.status.charAt(0) + p.status.slice(1).toLowerCase()}</Pill>
                    </td>
                    <td className="whitespace-nowrap text-right tabular-nums">
                      {inr(p.price)}
                      {p.compareAtPrice ? <span className="block text-xs text-ink-300 line-through">{inr(p.compareAtPrice)}</span> : null}
                    </td>
                    <td className={`text-right tabular-nums ${stock === 0 ? "text-wine-700" : stock <= 5 ? "text-amber-700" : ""}`}>{stock}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} total={total} perPage={PER_PAGE} base="/admin/products" params={{ q, category, status }} />
    </>
  );
}

function descendants(cats: { id: string; parentId: string | null }[], id: string): string[] {
  const kids = cats.filter((c) => c.parentId === id).map((c) => c.id);
  return kids.flatMap((k) => [k, ...descendants(cats, k)]);
}
