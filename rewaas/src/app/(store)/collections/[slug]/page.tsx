import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Img from "@/components/Img";
import ProductListing from "@/components/listing/ProductListing";
import { getCollection, getFacets, listProducts, OCCASIONS, type ListingParams } from "@/lib/catalog";
import { db } from "@/lib/db";
import { SITE_URL, jsonLd } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<ListingParams> };

const HERO: Record<string, string> = {
  sarees: "/photos/cat-sarees.jpg", "suits-sets": "/photos/cat-suits-sets.jpg", lehengas: "/photos/cat-lehengas.jpg", kurtis: "/photos/cat-kurtis.jpg",
  "bridal-wear": "/photos/cat-bridal-wear.jpg", "gift-hampers": "/photos/cat-gift-hampers.jpg", bridal: "/photos/bridal-edit.jpg", festive: "/photos/occ-festive.jpg",
  "new-arrivals": "/photos/hero-2.jpg", "best-sellers": "/photos/hero-1.jpg", "limited-edition": "/photos/featured.jpg", all: "/photos/hero-1.jpg",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCollection(slug);
  if (!c) return {};
  const cat = c.categorySlug ? await db.category.findUnique({ where: { slug }, select: { metaTitle: true, metaDescription: true } }) : null;
  return {
    title: cat?.metaTitle?.replace(" | REWAAS", "") ?? `${c.title} for Women`,
    description: cat?.metaDescription ?? c.description,
    alternates: { canonical: `/collections/${slug}` },
    openGraph: { images: HERO[slug] ? [HERO[slug]] : undefined },
  };
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const c = await getCollection(slug);
  if (!c) notFound();
  const [{ products, total, take }, facets, cat] = await Promise.all([
    listProducts(c.where, sp),
    getFacets(c.where),
    c.categorySlug ? db.category.findUnique({ where: { slug }, include: { parent: true, children: { orderBy: { sortOrder: "asc" } } } }) : null,
  ]);
  const siblings = cat ? (cat.parent ? await db.category.findMany({ where: { parentId: cat.parentId }, orderBy: { sortOrder: "asc" } }) : cat.children) : [];
  const occasion = typeof sp.occasion === "string" ? OCCASIONS.find((o) => o.slug === sp.occasion) : undefined;
  const title = occasion && slug === "all" ? occasion.label : c.title;
  const hero = HERO[slug] ?? HERO[cat?.parent?.slug ?? ""] ?? (occasion ? `/photos/occ-${occasion.slug}.jpg` : undefined);
  const crumbs = [{ name: "Home", url: "/" }, ...(cat?.parent ? [{ name: cat.parent.name, url: `/collections/${cat.parent.slug}` }] : []), { name: title, url: `/collections/${slug}` }];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd({
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "BreadcrumbList", itemListElement: crumbs.map((b, i) => ({ "@type": "ListItem", position: i + 1, name: b.name, item: `${SITE_URL}${b.url}` })) },
          { "@type": "CollectionPage", name: title, description: c.description, url: `${SITE_URL}/collections/${slug}` },
        ],
      })} />
      <section className="relative overflow-hidden bg-ivory-200">
        <div className="container-site grid items-center gap-8 py-10 md:grid-cols-2 md:py-0">
          <div className="md:py-16">
            <nav aria-label="Breadcrumb" className="mb-5 text-[11px] uppercase tracking-[0.16em] text-ink-400">
              {crumbs.map((b, i) => <span key={b.url}>{i > 0 && <span className="mx-2 text-ink-200">/</span>}{i < crumbs.length - 1 ? <Link href={b.url} className="hover:text-wine">{b.name}</Link> : <span className="text-ink">{b.name}</span>}</span>)}
            </nav>
            <h1 className="h-display">{title}</h1>
            {c.description && <p className="lead mt-4 max-w-md">{occasion && slug === "all" ? `Curated pieces for ${occasion.label.toLowerCase()} — from heirloom silks to easy everyday styles.` : c.description}</p>}
            {siblings.length > 0 && (
              <div className="no-scrollbar -mx-4 mt-7 flex gap-2 overflow-x-auto px-4">
                {cat?.parent && <Link href={`/collections/${cat.parent.slug}`} className="chip whitespace-nowrap">All {cat.parent.name}</Link>}
                {siblings.map((s) => <Link key={s.id} href={`/collections/${s.slug}`} className={`chip whitespace-nowrap ${s.slug === slug ? "chip-active" : ""}`}>{s.name}</Link>)}
              </div>
            )}
          </div>
          {hero && (
            <div className="relative hidden h-[380px] md:block lg:h-[440px]">
              <Img src={hero} alt={title} fill priority sizes="50vw" className="object-cover object-[50%_25%]" />
              <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-ivory-200 to-transparent" />
            </div>
          )}
        </div>
      </section>
      <div className="container-site py-12 lg:py-16">
        <ProductListing products={products} total={total} take={take} facets={facets} params={sp} basePath={`/collections/${slug}`} showCategory={!cat?.parent} />
      </div>
    </>
  );
}
