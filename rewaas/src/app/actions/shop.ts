"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { findCart, getCartView, type CartView } from "@/lib/cart";
import { getOwner } from "@/lib/visitor";
import { evaluateCoupon } from "@/lib/pricing";
import { resolveHamper } from "@/lib/hamper";
import { checkPincode, type PincodeResult } from "@/lib/pincode";

type Res = { ok: true; cart: CartView; message?: string } | { ok: false; error: string; cart?: CartView };

export async function fetchCart(): Promise<CartView> {
  return getCartView();
}

export async function addToCart(variantId: string, quantity = 1): Promise<Res> {
  const qty = Math.max(1, Math.min(10, Math.floor(quantity)));
  const variant = await db.variant.findUnique({ where: { id: variantId }, include: { product: { select: { status: true, name: true } } } });
  if (!variant || variant.product.status !== "ACTIVE") return { ok: false, error: "This product is no longer available." };
  const cart = await findCart(true);
  if (!cart) return { ok: false, error: "Please enable cookies to use the bag." };
  const existing = await db.cartItem.findFirst({ where: { cartId: cart.id, variantId } });
  const newQty = (existing?.quantity ?? 0) + qty;
  if (variant.stock < newQty) return { ok: false, error: variant.stock > 0 ? `Only ${variant.stock} left in this size.` : "This size is sold out." };
  if (existing) await db.cartItem.update({ where: { id: existing.id }, data: { quantity: Math.min(10, newQty) } });
  else await db.cartItem.create({ data: { cartId: cart.id, kind: "PRODUCT", productId: variant.productId, variantId, quantity: qty } });
  await db.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
  revalidatePath("/cart");
  return { ok: true, cart: await getCartView(), message: `${variant.product.name} added to your bag` };
}

export async function addHamperToCart(config: unknown, quantity = 1): Promise<Res> {
  const r = await resolveHamper(config, quantity);
  if (!r.ok) return { ok: false, error: r.error };
  const cart = await findCart(true);
  if (!cart) return { ok: false, error: "Please enable cookies to use the bag." };
  await db.cartItem.create({ data: { cartId: cart.id, kind: "HAMPER", quantity: Math.max(1, Math.min(10, quantity)), hamperConfig: r.hamper.config } });
  return { ok: true, cart: await getCartView(), message: "Your custom hamper is in the bag" };
}

async function ownItem(itemId: string) {
  const cart = await findCart(false);
  if (!cart) return null;
  return db.cartItem.findFirst({ where: { id: itemId, cartId: cart.id }, include: { variant: true } });
}

export async function updateCartItem(itemId: string, quantity: number): Promise<Res> {
  const item = await ownItem(itemId);
  if (!item) return { ok: false, error: "Item not found in your bag." };
  if (quantity <= 0) await db.cartItem.delete({ where: { id: item.id } });
  else {
    const q = Math.min(10, Math.floor(quantity));
    if (item.variant && item.variant.stock < q) return { ok: false, error: `Only ${item.variant.stock} available.`, cart: await getCartView() };
    if (item.kind === "HAMPER") {
      const r = await resolveHamper(item.hamperConfig, q);
      if (!r.ok) return { ok: false, error: r.error, cart: await getCartView() };
    }
    await db.cartItem.update({ where: { id: item.id }, data: { quantity: q } });
  }
  revalidatePath("/cart");
  return { ok: true, cart: await getCartView() };
}

export async function removeCartItem(itemId: string): Promise<Res> {
  return updateCartItem(itemId, 0);
}

export async function applyCoupon(code: string): Promise<Res> {
  const clean = code.trim().toUpperCase();
  if (!clean) return { ok: false, error: "Enter a coupon code." };
  const cart = await findCart(false);
  if (!cart) return { ok: false, error: "Your bag is empty." };
  const view = await getCartView();
  const coupon = await db.coupon.findUnique({ where: { code: clean } });
  const r = evaluateCoupon(coupon, view.totals.subtotal);
  if (!r.ok) return { ok: false, error: r.error, cart: view };
  await db.cart.update({ where: { id: cart.id }, data: { couponCode: clean } });
  revalidatePath("/cart");
  return { ok: true, cart: await getCartView(), message: `${clean} applied` };
}

export async function removeCoupon(): Promise<Res> {
  const cart = await findCart(false);
  if (cart) await db.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
  revalidatePath("/cart");
  return { ok: true, cart: await getCartView() };
}

export async function toggleWishlist(productId: string): Promise<{ ok: boolean; wished: boolean; error?: string }> {
  const owner = await getOwner();
  if (!owner.userId && !owner.visitorId) return { ok: false, wished: false, error: "Please enable cookies." };
  const where = owner.userId ? { userId: owner.userId, productId } : { visitorId: owner.visitorId, productId };
  const existing = await db.wishlistItem.findFirst({ where });
  if (existing) {
    await db.wishlistItem.delete({ where: { id: existing.id } });
    revalidatePath("/wishlist");
    return { ok: true, wished: false };
  }
  const product = await db.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) return { ok: false, wished: false, error: "Product not found." };
  await db.wishlistItem.create({ data: where });
  revalidatePath("/wishlist");
  return { ok: true, wished: true };
}

export async function checkDelivery(pincode: string): Promise<PincodeResult> {
  return checkPincode(pincode);
}

const emailOnly = z.string().trim().toLowerCase().email();
export async function subscribeNewsletter(_: unknown, form: FormData): Promise<{ ok: boolean; message: string }> {
  const parsed = emailOnly.safeParse(form.get("email"));
  if (!parsed.success) return { ok: false, message: "Please enter a valid email address." };
  await db.newsletterSubscriber.upsert({ where: { email: parsed.data }, create: { email: parsed.data, source: String(form.get("source") ?? "site") }, update: {} });
  return { ok: true, message: "Thank you — you're on the list. Watch your inbox for first looks." };
}
