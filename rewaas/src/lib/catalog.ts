import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";

export type CollectionDef = {
  slug: string;
  title: string;
  description: string;
  where: Prisma.ProductWhereInput;
  categorySlug?: string;
};

const STATIC: Record<string, Omit<CollectionDef, "slug">> = {
  all: { title: "All Products", description: "Every REWAAS piece — from heirloom sarees to curated gifting.", where: {} },
  "new-arrivals": { title: "New Arrivals", description: "Fresh off our looms and ateliers — the newest additions to REWAAS.", where: { isNew: true } },
  "best-sellers": { title: "Best Sellers", description: "The pieces our customers return to, again and again.", where: { isBestseller: true } },
  festive: { title: "Festive Collection", description: "Luminous silks, zari and hand embroidery for Diwali, Karwa Chauth, Eid and every celebration in between.", where: { collections: { has: "festive" } } },
  bridal: { title: "The Bridal Edit", description: "Heirloom lehengas, wedding sarees and bride-to-be gifting — crafted for the most important days of your life.", where: { collections: { has: "bridal" } } },
  "limited-edition": { title: "Limited Edition", description: "Small-batch pieces, woven once and never repeated.", where: { collections: { has: "limited-edition" } } },
};

export const OCCASIONS = [
  { slug: "wedding", label: "Wedding Wear" },
  { slug: "festive", label: "Festive Wear" },
  { slug: "party", label: "Party Wear" },
  { slug: "everyday", label: "Everyday Wear" },
  { slug: "office", label: "Office Wear" },
  { slug: "traditional", label: "Traditional Occasions" },
] as const;

export async function getCollection(slug: string): Promise<CollectionDef | null> {
  if (STATIC[slug]) return { slug, ...STATIC[slug] };
  const cat = await db.category.findUnique({ where: { slug }, include: { children: { select: { id: true } } } });
  if (!cat) return null;
  return {
    slug,
    title: cat.name,
    description: cat.description ?? "",
    categorySlug: cat.slug,
    where: { categoryId: { in: [cat.id, ...cat.children.map((c) => c.id)] } },
  };
}

export const cardSelect = {
  id: true,
  slug: true,
  name: true,
  price: true,
  compareAtPrice: true,
  isNew: true,
  isBestseller: true,
  popularity: true,
  createdAt: true,
  category: { select: { name: true, slug: true } },
  images: { select: { url: true, alt: true }, orderBy: { sortOrder: "asc" }, take: 2 },
  variants: { select: { id: true, size: true, colour: true, colourHex: true, stock: true, price: true }, orderBy: { id: "asc" } },
} satisfies Prisma.ProductSelect;

export type CardProduct = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

export type ListingParams = {
  q?: string;
  sort?: string;
  min?: string;
  max?: string;
  cat?: string | string[];
  size?: string | string[];
  fabric?: string | string[];
  occasion?: string | string[];
  avail?: string;
  show?: string;
};

const arr = (v?: string | string[]) => (v == null ? [] : Array.isArray(v) ? v : v.split(",")).filter(Boolean);

export const PAGE_SIZE = 12;

export async function listProducts(base: Prisma.ProductWhereInput, p: ListingParams) {
  const and: Prisma.ProductWhereInput[] = [{ status: "ACTIVE" }, base];
  if (p.q?.trim()) {
    const q = p.q.trim();
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { fabric: { contains: q, mode: "insensitive" } },
        { tags: { has: q.toLowerCase() } },
        { category: { name: { contains: q, mode: "insensitive" } } },
      ],
    });
  }
  const min = parseInt(p.min ?? "", 10);
  const max = parseInt(p.max ?? "", 10);
  if (Number.isFinite(min)) and.push({ price: { gte: min * 100 } });
  if (Number.isFinite(max)) and.push({ price: { lte: max * 100 } });
  const cats = arr(p.cat);
  if (cats.length) and.push({ category: { slug: { in: cats } } });
  const sizes = arr(p.size);
  if (sizes.length) and.push({ variants: { some: { size: { in: sizes }, stock: { gt: 0 } } } });
  const fabrics = arr(p.fabric);
  if (fabrics.length) and.push({ OR: fabrics.map((f) => ({ fabric: { contains: f, mode: "insensitive" as const } })) });
  const occ = arr(p.occasion);
  if (occ.length) and.push({ occasions: { hasSome: occ } });
  if (p.avail === "in") and.push({ variants: { some: { stock: { gt: 0 } } } });
  if (p.avail === "out") and.push({ variants: { every: { stock: { lte: 0 } } } });

  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    p.sort === "price-asc" ? [{ price: "asc" }]
    : p.sort === "price-desc" ? [{ price: "desc" }]
    : p.sort === "popular" ? [{ popularity: "desc" }, { createdAt: "desc" }]
    : p.sort === "newest" ? [{ createdAt: "desc" }]
    : [{ isFeatured: "desc" }, { popularity: "desc" }, { createdAt: "desc" }];

  const take = Math.min(96, Math.max(PAGE_SIZE, parseInt(p.show ?? "", 10) || PAGE_SIZE));
  const where = { AND: and };
  const [products, total] = await Promise.all([
    db.product.findMany({ where, orderBy, take, select: cardSelect }),
    db.product.count({ where }),
  ]);
  return { products, total, take };
}

/** Facet values available within a base collection (for the filter sidebar). */
export async function getFacets(base: Prisma.ProductWhereInput) {
  const where = { AND: [{ status: "ACTIVE" as const }, base] };
  const [products, priceAgg] = await Promise.all([
    db.product.findMany({
      where,
      select: { fabric: true, occasions: true, category: { select: { slug: true, name: true } }, variants: { select: { size: true } } },
    }),
    db.product.aggregate({ where, _min: { price: true }, _max: { price: true } }),
  ]);
  const fabrics = new Map<string, number>();
  const sizes = new Set<string>();
  const occasions = new Set<string>();
  const cats = new Map<string, string>();
  for (const p of products) {
    if (p.fabric) {
      const key = p.fabric.split(/[,&/]| with /i)[0].trim();
      fabrics.set(key, (fabrics.get(key) ?? 0) + 1);
    }
    p.variants.forEach((v) => sizes.add(v.size));
    p.occasions.forEach((o) => occasions.add(o));
    cats.set(p.category.slug, p.category.name);
  }
  const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "Free Size"];
  return {
    fabrics: [...fabrics.keys()].sort(),
    sizes: [...sizes].sort((a, b) => (SIZE_ORDER.indexOf(a) + 99) % 100 - (SIZE_ORDER.indexOf(b) + 99) % 100),
    occasions: [...occasions].sort(),
    categories: [...cats.entries()].map(([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name)),
    minPrice: Math.floor((priceAgg._min.price ?? 0) / 100),
    maxPrice: Math.ceil((priceAgg._max.price ?? 0) / 100),
  };
}

export async function productsFor(where: Prisma.ProductWhereInput, take = 8, orderBy: Prisma.ProductOrderByWithRelationInput[] = [{ createdAt: "desc" }]) {
  return db.product.findMany({ where: { AND: [{ status: "ACTIVE" }, where] }, take, orderBy, select: cardSelect });
}
