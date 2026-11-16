"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCartView, findCart } from "@/lib/cart";
import { getCurrentUser } from "@/lib/auth";
import { getSettings, num } from "@/lib/settings";
import { computeTotals, evaluateCoupon } from "@/lib/pricing";
import { checkPincode, estimatedDeliveryDate } from "@/lib/pincode";
import { addressSchema, emailSchema, phoneSchema, normalizePhone, formErrors } from "@/lib/validators";
import { reserveStock, restoreStock, bumpPopularity } from "@/lib/orders";
import { createRazorpayOrder, razorpayEnabled } from "@/lib/razorpay";
import { orderToken } from "@/lib/order-token";
import { orderNumber } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

const checkoutSchema = z.object({
  email: emailSchema,
  phone: phoneSchema,
  address: addressSchema,
  saveAddress: z.boolean().optional(),
  paymentMethod: z.enum(["RAZORPAY", "COD"]),
  giftWrap: z.boolean().optional(),
  giftMessage: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(500).optional(),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export type PlaceOrderResult =
  | { ok: true; kind: "redirect"; url: string }
  | { ok: true; kind: "razorpay"; orderNumber: string; razorpay: { key: string; orderId: string; amount: number; name: string; email: string; contact: string } }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

async function releaseCoupon(orderId: string) {
  const o = await db.order.findUnique({ where: { id: orderId }, select: { couponCode: true } });
  if (o?.couponCode) await db.coupon.updateMany({ where: { code: o.couponCode, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
}

/** Releases stock held by online-payment orders that were never paid (abandoned for 45+ minutes). */
async function releaseStalePending() {
  const stale = await db.order.findMany({ where: { status: "PENDING_PAYMENT", paymentMethod: "RAZORPAY", createdAt: { lt: new Date(Date.now() - 45 * 60 * 1000) } }, select: { id: true } });
  for (const o of stale) {
    await restoreStock(o.id);
    await releaseCoupon(o.id);
    await db.order.update({ where: { id: o.id }, data: { status: "CANCELLED", paymentStatus: "FAILED", cancelReason: "Payment not completed", events: { create: { status: "CANCELLED", note: "Payment window expired" } } } });
  }
}

export async function placeOrder(input: CheckoutInput): Promise<PlaceOrderResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check the highlighted fields.", fieldErrors: formErrors(parsed.error) };
  const d = parsed.data;
  await releaseStalePending();

  const [cart, settings, user] = await Promise.all([getCartView(), getSettings(), getCurrentUser()]);
  if (!cart.cartId || !cart.lines.length) return { ok: false, error: "Your bag is empty." };
  const bad = cart.lines.find((l) => l.issue && !l.issue.startsWith("Only"));
  if (bad) return { ok: false, error: `${bad.name}: ${bad.issue}` };
  const short = cart.lines.find((l) => l.kind === "PRODUCT" && l.quantity > l.maxQty);
  if (short) return { ok: false, error: `Only ${short.maxQty} × ${short.name} (${short.size}) available. Please update your bag.` };

  const pin = checkPincode(d.address.pincode);
  if (!pin.ok) return { ok: false, error: pin.error, fieldErrors: { "address.pincode": pin.error } };
  const cod = d.paymentMethod === "COD";
  if (cod && !pin.cod) return { ok: false, error: "Cash on Delivery isn't available for this PIN code. Please pay online." };
  if (!cod && !razorpayEnabled()) return { ok: false, error: "Online payment is temporarily unavailable. Please choose Cash on Delivery." };

  // Re-evaluate coupon on the server
  let discount = 0;
  let couponCode: string | null = null;
  if (cart.couponCode) {
    const coupon = await db.coupon.findUnique({ where: { code: cart.couponCode } });
    const r = evaluateCoupon(coupon, cart.totals.subtotal);
    if (r.ok) { discount = r.discount; couponCode = r.coupon.code; }
  }
  const totals = computeTotals(cart.lines, settings, { discount, cod, giftWrap: d.giftWrap });
  if (cod && totals.total > num(settings.codMaxOrder)) return { ok: false, error: `Cash on Delivery is available on orders up to ₹${(num(settings.codMaxOrder) / 100).toLocaleString("en-IN")}. Please pay online.` };

  const items: Prisma.OrderItemCreateWithoutOrderInput[] = cart.lines.map((l) => ({
    kind: l.kind,
    product: l.productId ? { connect: { id: l.productId } } : undefined,
    variantId: l.variantId ?? null,
    name: l.name,
    image: l.image,
    sku: l.sku ?? null,
    size: l.size ?? null,
    colour: l.colour ?? null,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    total: l.unitPrice * l.quantity,
    gstRate: l.gstRate,
    hamperConfig: l.hamper ? (JSON.parse(JSON.stringify({ box: l.hamper.box, components: l.hamper.components, packaging: l.hamper.packaging, config: l.hamper.config })) as Prisma.InputJsonValue) : undefined,
  }));

  const number = orderNumber();
  const phone = normalizePhone(d.phone);
  const address = { ...d.address, phone: normalizePhone(d.address.phone) };
  let orderId: string;
  try {
    const order = await db.$transaction(async (tx) => {
      await reserveStock(tx, cart.lines.map((l) => ({ kind: l.kind, variantId: l.variantId, quantity: l.quantity, hamperConfig: l.hamper ? { box: l.hamper.box, components: l.hamper.components } : undefined })));
      if (couponCode) {
        const c = await tx.coupon.updateMany({ where: { code: couponCode, OR: [{ usageLimit: null }, { usedCount: { lt: tx.coupon.fields.usageLimit } }] }, data: { usedCount: { increment: 1 } } });
        if (c.count === 0) throw new Error("COUPON");
      }
      return tx.order.create({
        data: {
          number, userId: user?.id ?? null, email: d.email, phone, shippingAddress: address,
          subtotal: totals.subtotal, discount: totals.discount, shippingFee: totals.shippingFee, codFee: totals.codFee, giftWrapFee: totals.giftWrapFee,
          taxAmount: totals.taxAmount, total: totals.total, couponCode,
          status: cod ? "CONFIRMED" : "PENDING_PAYMENT", paymentMethod: d.paymentMethod, paymentStatus: "PENDING",
          estimatedDelivery: estimatedDeliveryDate(d.address.pincode), giftMessage: d.giftMessage || null, notes: d.notes || null,
          items: { create: items },
          events: { create: { status: cod ? "CONFIRMED" : "PENDING_PAYMENT", note: cod ? "Order placed — Cash on Delivery" : "Awaiting online payment" } },
        },
      });
    });
    orderId = order.id;
  } catch (e) {
    if (e instanceof Error && e.message === "STOCK") return { ok: false, error: "Sorry — one of the items just sold out. Please review your bag." };
    if (e instanceof Error && e.message === "COUPON") return { ok: false, error: "This coupon has just reached its usage limit. Please remove it to continue." };
    console.error("placeOrder failed", e);
    return { ok: false, error: "We couldn't place your order. Please try again." };
  }

  if (user && d.saveAddress) {
    const exists = await db.address.findFirst({ where: { userId: user.id, line1: address.line1, pincode: address.pincode } });
    if (!exists) {
      const count = await db.address.count({ where: { userId: user.id } });
      await db.address.create({ data: { ...address, line2: address.line2 || null, landmark: address.landmark || null, userId: user.id, isDefault: count === 0 } });
    }
  }

  if (cod) {
    await db.cartItem.deleteMany({ where: { cartId: cart.cartId } });
    await db.cart.update({ where: { id: cart.cartId }, data: { couponCode: null } });
    await bumpPopularity(orderId);
    revalidatePath("/cart");
    return { ok: true, kind: "redirect", url: `/order/${number}?t=${orderToken(number)}` };
  }

  try {
    const rp = await createRazorpayOrder({ amount: totals.total, receipt: number, notes: { orderNumber: number } });
    await db.order.update({ where: { id: orderId }, data: { razorpayOrderId: rp.id } });
    return { ok: true, kind: "razorpay", orderNumber: number, razorpay: { key: process.env.RAZORPAY_KEY_ID!, orderId: rp.id, amount: totals.total, name: address.name, email: d.email, contact: phone } };
  } catch (e) {
    console.error(e);
    await restoreStock(orderId);
    await releaseCoupon(orderId);
    await db.order.update({ where: { id: orderId }, data: { status: "CANCELLED", paymentStatus: "FAILED", cancelReason: "Payment gateway error", events: { create: { status: "CANCELLED", note: "Could not start payment" } } } });
    return { ok: false, error: "We couldn't connect to the payment gateway. Please try again or choose Cash on Delivery." };
  }
}

/** Customer closed the Razorpay window or payment failed: release the held stock so they can retry. */
export async function abandonPayment(number: string): Promise<{ ok: boolean }> {
  const order = await db.order.findUnique({ where: { number } });
  if (!order || order.status !== "PENDING_PAYMENT" || order.paymentStatus === "PAID") return { ok: false };
  const cart = await findCart(false);
  const user = await getCurrentUser();
  // Only the person who created it (same session/cart) may abandon it
  if (order.userId && order.userId !== user?.id) return { ok: false };
  if (!order.userId && !cart) return { ok: false };
  await restoreStock(order.id);
  await releaseCoupon(order.id);
  await db.order.update({ where: { id: order.id }, data: { status: "CANCELLED", paymentStatus: "FAILED", cancelReason: "Payment not completed", events: { create: { status: "CANCELLED", note: "Payment cancelled by customer" } } } });
  return { ok: true };
}
