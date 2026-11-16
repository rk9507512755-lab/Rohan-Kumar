import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { findCart } from "@/lib/cart";
import { markOrderPaid } from "@/lib/orders";
import { razorpayEnabled, verifyPaymentSignature } from "@/lib/razorpay";
import { orderToken } from "@/lib/order-token";

const body = z.object({ razorpay_order_id: z.string().min(1), razorpay_payment_id: z.string().min(1), razorpay_signature: z.string().min(1) });

export async function POST(req: Request) {
  if (!razorpayEnabled()) return NextResponse.json({ ok: false, error: "Payments not configured" }, { status: 503 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;
  if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature))
    return NextResponse.json({ ok: false, error: "Payment verification failed" }, { status: 400 });
  const order = await markOrderPaid(razorpay_order_id, razorpay_payment_id);
  if (!order) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  // Clear the buyer's bag now that payment is confirmed
  const cart = await findCart(false);
  if (cart) {
    await db.cartItem.deleteMany({ where: { cartId: cart.id } });
    await db.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
  }
  return NextResponse.json({ ok: true, url: `/order/${order.number}?t=${orderToken(order.number)}` });
}
