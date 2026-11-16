import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Gallery from "@/components/product/Gallery";
import BuyBox from "@/components/product/BuyBox";
import Reviews, { Stars } from "@/components/product/Reviews";
import ProductCard from "@/components/ProductCard";
import SectionHeading from "@/components/SectionHeading";
import { db } from "@/lib/db";
import { productsFor } from "@/lib/catalog";
import { getSession } from "@/lib/auth";
import { SIZE_CHARTS } from "@/lib/size-charts";
import { SITE_URL, absUrl, jsonLd } from "@/lib/seo";
import { titleCase } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  return db.product.findUnique({
    where: { slug },
    include: {
      category: { include: { parent: true } },
      images: { orderBy: { sortOrder: "asc" } },
      variants: { orderBy: { id: "asc" } },
      reviews: { where: { approved: true }, orderBy: { createdAt: "desc" }, take: 30 },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await db.product.findUnique({ where: { slug }, select: { name: true, metaTitle: true, metaDescription: true, shortDescription: true, status: true, images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } } } });
  if (!p) return {};
  return {
    title: p.metaTitle?.replace(/ \| REWAAS$/, "") ?? p.name,
    description: p.metaDescription ?? p.shortDescription ?? undefined,
    alternates: { canonical: `/products/${slug}` },
    openGraph: { type: "website", title: p.name, description: p.shortDescription ?? undefined, images: p.images[0] ? [absUrl(p.images[0].url)] : undefined },
    robots: p.status === "ACTIVE" ? undefined : { index: false },
  };
}

function Accordion({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group border-b border-ink-200/70">
      <summary className="flex cursor-pointer items-center justify-between py-5 text-[11px] uppercase tracking-[0.18em]">{title}<span className="text-lg leading-none text-ink-400 transition group-open:rotate-45">+</span></summary>
      <div className="pb-6 text-[15px] leading-7 text-ink/80">{children}</div>
    </details>
  );
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const p = await load(slug);
  if (!p || p.status === "ARCHIVED") notFound();
  const session = await getSession();
  if (p.status === "DRAFT" && session?.role !== "ADMIN") notFound();

  const parentSlug = p.category.parent?.slug ?? p.category.slug;
  const isHamper = parentSlug === "gift-hampers";
  const [related, completeLook] = await Promise.all([
    productsFor({ id: { not: p.id }, OR: [{ categoryId: p.categoryId }, { category: { parentId: p.category.parentId ?? p.categoryId } }] }, 4, [{ popularity: "desc" }]),
    productsFor({ id: { not: p.id }, category: { slug: { in: isHamper ? ["bridal-hampers", "festive-hampers"] : ["bridal-accessories", "dupattas"] } } }, 4, [{ popularity: "desc" }]),
  ]);
  const avg = p.reviews.length ? p.reviews.reduce((a, r) => a + r.rating, 0) / p.reviews.length : 0;
  const inStock = p.variants.some((v) => v.stock > 0);
  const chart = SIZE_CHARTS[p.sizeChart];
  const crumbs = [{ name: "Home", url: "/" }, ...(p.category.parent ? [{ name: p.category.parent.name, url: `/collections/${p.category.parent.slug}` }] : []), { name: p.category.name, url: `/collections/${p.category.slug}` }, { name: p.name, url: `/products/${p.slug}` }];

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        name: p.name,
        description: p.description,
        image: p.images.map((i) => absUrl(i.url)),
        sku: p.variants[0]?.sku,
        brand: { "@type": "Brand", name: "REWAAS" },
        material: p.fabric ?? undefined,
        category: p.category.name,
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "INR",
          lowPrice: (Math.min(...p.variants.map((v) => v.price ?? p.price)) / 100).toFixed(2),
          highPrice: (Math.max(...p.variants.map((v) => v.price ?? p.price)) / 100).toFixed(2),
          offerCount: p.variants.length,
          availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          url: `${SITE_URL}/products/${p.slug}`,
          seller: { "@type": "Organization", name: "REWAAS" },
        },
        ...(p.reviews.length ? {
          aggregateRating: { "@type": "AggregateRating", ratingValue: avg.toFixed(1), reviewCount: p.reviews.length },
          review: p.reviews.slice(0, 5).map((r) => ({ "@type": "Review", author: { "@type": "Person", name: r.name }, reviewRating: { "@type": "Rating", ratingValue: r.rating }, reviewBody: r.body, datePublished: r.createdAt.toISOString().slice(0, 10) })),
        } : {}),
      },
      { "@type": "BreadcrumbList", itemListElement: crumbs.map((b, i) => ({ "@type": "ListItem", position: i + 1, name: b.name, item: `${SITE_URL}${b.url}` })) },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(schema)} />
      <div className="container-site pt-6 lg:pt-8">
        <nav aria-label="Breadcrumb" className="no-scrollbar overflow-x-auto whitespace-nowrap text-[11px] uppercase tracking-[0.14em] text-ink-400">
          {crumbs.map((b, i) => <span key={b.url}>{i > 0 && <span className="mx-2 text-ink-200">/</span>}{i < crumbs.length - 1 ? <Link href={b.url} className="hover:text-wine">{b.name}</Link> : <span className="text-ink">{b.name}</span>}</span>)}
        </nav>
      </div>
      <div className="container-site grid gap-10 py-8 lg:grid-cols-[1.15fr_1fr] lg:gap-16 xl:gap-24">
        <Gallery images={p.images.map((i) => ({ url: i.url, alt: i.alt }))} videoUrl={p.videoUrl} name={p.name} />
        <div className="animate-fadeUp">
          <p className="eyebrow">{p.category.name}</p>
          <h1 className="mt-2 font-display text-[2.1rem] leading-tight sm:text-[2.6rem]">{p.name}</h1>
          {p.reviews.length > 0 && <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-xs text-ink-400 hover:text-wine"><Stars value={avg} size={14} />{avg.toFixed(1)} · {p.reviews.length} reviews</a>}
          {p.shortDescription && <p className="mt-4 text-[15px] leading-relaxed text-ink-400">{p.shortDescription}</p>}
          <div className="mt-7">
            <BuyBox product={{ id: p.id, name: p.name, price: p.price, compareAtPrice: p.compareAtPrice, isHamper }} variants={p.variants.map((v) => ({ id: v.id, size: v.size, colour: v.colour, colourHex: v.colourHex, stock: v.stock, price: v.price }))} chart={chart} />
          </div>
          <div className="mt-10 border-t border-ink-200/70">
            <Accordion title="Description" open><p>{p.description}</p>
              {p.occasions.length > 0 && <p className="mt-4 text-sm text-ink-400">Perfect for: {p.occasions.map((o) => <Link key={o} href={`/collections/all?occasion=${o}`} className="mr-2 text-wine underline-offset-4 hover:underline">{titleCase(o)}</Link>)}</p>}
            </Accordion>
            <Accordion title={isHamper ? "What's inside" : "Fabric & craft"}>
              <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
                {p.fabric && <><dt className="text-ink-400">{isHamper ? "Type" : "Fabric"}</dt><dd>{p.fabric}</dd></>}
                {p.work && <><dt className="text-ink-400">{isHamper ? "Packing" : "Craft"}</dt><dd>{p.work}</dd></>}
                <dt className="text-ink-400">SKU</dt><dd>{p.variants[0]?.sku}</dd>
                {!isHamper && <><dt className="text-ink-400">Origin</dt><dd>Handcrafted in India</dd></>}
              </dl>
              <p className="mt-4 text-sm text-ink-400">Handcrafted pieces may show slight irregularities in weave or colour — the signature of the human hand.</p>
            </Accordion>
            {p.washCare && <Accordion title={isHamper ? "Storage" : "Wash care"}><p>{p.washCare}</p></Accordion>}
            <Accordion title="Delivery, returns & exchange">
              <ul className="list-none space-y-2 text-sm">
                <li>✦ Ready-to-ship orders dispatch within 1–2 business days; metro cities receive in 2–4 days.</li>
                <li>✦ Complimentary shipping above ₹1,999. Cash on Delivery available up to ₹25,000.</li>
                <li>✦ {isHamper ? "Hampers with edibles or personalisation are not returnable; damaged items are replaced." : "Easy 7-day size exchanges and returns on unused pieces with tags."}</li>
              </ul>
              <Link href="/pages/returns-exchanges" className="mt-3 inline-block text-sm text-wine underline underline-offset-4">Read the full policy</Link>
            </Accordion>
          </div>
        </div>
      </div>

      {completeLook.length > 0 && (
        <section className="bg-ivory-200/70 py-16 lg:py-24">
          <div className="container-site">
            <SectionHeading align="left" eyebrow={isHamper ? "More to Gift" : "Complete the Look"} title={isHamper ? "You May Also Gift" : "Finishing Touches"} />
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 lg:gap-x-6">{completeLook.map((r) => <ProductCard key={r.id} p={r} />)}</div>
          </div>
        </section>
      )}

      <Reviews reviews={p.reviews} productId={p.id} productSlug={p.slug} canReview={!!session} />

      {related.length > 0 && (
        <section className="container-site pb-8">
          <SectionHeading align="left" eyebrow="You May Also Love" title={`More ${p.category.parent?.name ?? p.category.name}`} href={`/collections/${parentSlug}`} />
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 lg:gap-x-6">{related.map((r) => <ProductCard key={r.id} p={r} />)}</div>
        </section>
      )}
    </>
  );
}

export const dynamicParams = true;
