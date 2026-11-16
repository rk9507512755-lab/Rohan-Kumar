import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, pages] = await Promise.all([
    db.product.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true, images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } } } }),
    db.category.findMany({ select: { slug: true } }),
    db.page.findMany({ select: { slug: true, updatedAt: true } }),
  ]);
  const now = new Date();
  const fixed = ["", "/gift-studio", "/gift-studio/create", "/collections/new-arrivals", "/collections/best-sellers", "/collections/festive", "/collections/bridal", "/collections/limited-edition", "/collections/all"];
  return [
    ...fixed.map((p) => ({ url: `${SITE_URL}${p}`, lastModified: now, changeFrequency: "daily" as const, priority: p === "" ? 1 : 0.8 })),
    ...categories.map((c) => ({ url: `${SITE_URL}/collections/${c.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.8 })),
    ...products.map((p) => ({ url: `${SITE_URL}/products/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.7, images: p.images.map((i) => (i.url.startsWith("http") ? i.url : `${SITE_URL}${i.url}`)) })),
    ...pages.map((p) => ({ url: `${SITE_URL}/pages/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "monthly" as const, priority: 0.3 })),
  ];
}
