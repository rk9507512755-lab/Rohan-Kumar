import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import Filters, { ActiveFilters, SortSelect, type Facets } from "./Filters";
import type { CardProduct, ListingParams } from "@/lib/catalog";

export default function ProductListing({ products, total, take, facets, params, basePath, showCategory = true }: { products: CardProduct[]; total: number; take: number; facets: Facets; params: ListingParams; basePath: string; showCategory?: boolean }) {
  const more = new URLSearchParams(Object.entries(params).filter(([k, v]) => k !== "show" && typeof v === "string" && v) as [string, string][]);
  more.set("show", String(take + 12));
  return (
    <div className="grid gap-10 lg:grid-cols-[250px_1fr] xl:gap-14">
      <Filters facets={facets} showCategory={showCategory} />
      <div>
        <div className="mb-6 flex items-center justify-between gap-4 border-b border-ink-200/70 pb-4">
          <p className="text-sm text-ink-400">{total} {total === 1 ? "piece" : "pieces"}</p>
          <SortSelect />
        </div>
        <ActiveFilters facets={facets} />
        {products.length ? (
          <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:gap-x-6">
              {products.map((p, i) => <ProductCard key={p.id} p={p} priority={i < 3} sizes="(min-width:1024px) 26vw, 50vw" />)}
            </div>
            <div className="mt-14 flex flex-col items-center gap-4">
              <p className="text-xs text-ink-400">Showing {products.length} of {total}</p>
              <div className="h-[2px] w-48 bg-ink-200/70"><div className="h-full bg-wine" style={{ width: `${Math.round((products.length / Math.max(1, total)) * 100)}%` }} /></div>
              {products.length < total && <Link href={`${basePath}?${more}`} scroll={false} className="btn-outline mt-2">Load more</Link>}
            </div>
          </>
        ) : (
          <div className="py-24 text-center">
            <p className="font-display text-3xl">Nothing matches — yet.</p>
            <p className="lead mt-2">Try removing a filter, or explore our newest pieces.</p>
            <Link href="/collections/new-arrivals" className="btn-primary mt-6">Shop New Arrivals</Link>
          </div>
        )}
      </div>
    </div>
  );
}
