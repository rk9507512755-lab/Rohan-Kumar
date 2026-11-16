import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { markOrderPaid } from "@/lib/orders";
import { verifyWebhookSignature } from "@/lib/razorpay";

// Configure in Razorpay Dashboard → Webhooks: events payment.captured, order.paid, payment.failed
export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(raw, sig)) return NextResponse.json({ ok: false }, { status: 401 });
  const evt = JSON.parse(raw) as { event: string; payload?: { payment?: { entity?: { id: string; order_id: string; error_description?: string } } } };
  const pay = evt.payload?.payment?.entity;
  if (!pay?.order_id) return NextResponse.json({ ok: true });
  if (evt.event === "payment.captured" || evt.event === "order.paid") {
    await markOrderPaid(pay.order_id, pay.id);
  } else if (evt.event === "payment.failed") {
    const order = await db.order.findUnique({ where: { razorpayOrderId: pay.order_id } });
    if (order && order.paymentStatus !== "PAID")
      await db.order.update({ where: { id: order.id }, data: { notes: [order.notes, `Payment attempt failed: ${pay.error_description ?? "unknown"}`].filter(Boolean).join("\n") } });
  }
  return NextResponse.json({ ok: true });
}
