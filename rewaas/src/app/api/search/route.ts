import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ products: [] });
  const products = await db.product.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { fabric: { contains: q, mode: "insensitive" } },
        { category: { name: { contains: q, mode: "insensitive" } } },
        { tags: { has: q.toLowerCase() } },
      ],
    },
    take: 6,
    orderBy: { popularity: "desc" },
    select: { slug: true, name: true, price: true, images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } }, category: { select: { name: true } } },
  });
  return NextResponse.json({ products: products.map((p) => ({ slug: p.slug, name: p.name, price: p.price, image: p.images[0]?.url ?? null, category: p.category.name })) });
}
