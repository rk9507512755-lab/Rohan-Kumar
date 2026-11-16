import type { Metadata } from "next";
import ProductListing from "@/components/listing/ProductListing";
import { getFacets, listProducts, type ListingParams } from "@/lib/catalog";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<ListingParams> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const [{ products, total, take }, facets] = await Promise.all([listProducts({}, sp), getFacets({})]);
  return (
    <div className="container-site py-12 lg:py-16">
      <p className="eyebrow">Search</p>
      <h1 className="h-section mt-2">{q ? <>Results for “{q}”</> : "Search our collections"}</h1>
      <div className="mt-10"><ProductListing products={products} total={total} take={take} facets={facets} params={sp} basePath="/search" /></div>
    </div>
  );
}
