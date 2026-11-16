"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const schema = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(80).optional(),
  body: z.string().trim().min(10, "Please write at least a few words (10+ characters).").max(1500),
  city: z.string().trim().max(60).optional(),
});

export async function submitReview(_: unknown, form: FormData): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in to write a review." };
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  const product = await db.product.findUnique({ where: { id: d.productId }, select: { slug: true } });
  if (!product) return { ok: false, error: "Product not found." };
  const already = await db.review.findFirst({ where: { productId: d.productId, userId: user.id } });
  if (already) return { ok: false, error: "You've already reviewed this piece." };
  const purchased = await db.orderItem.findFirst({ where: { productId: d.productId, order: { userId: user.id, status: { in: ["DELIVERED", "SHIPPED", "OUT_FOR_DELIVERY"] } } } });
  await db.review.create({ data: { productId: d.productId, userId: user.id, name: user.name, city: d.city || null, rating: d.rating, title: d.title || null, body: d.body, verified: !!purchased } });
  revalidatePath(`/products/${product.slug}`);
  return { ok: true };
}
