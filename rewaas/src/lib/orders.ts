import "server-only";
import type { OrderStatus, Prisma } from "@prisma/client";
import { db } from "./db";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  CONFIRMED: "Confirmed",
  PROCESSING: "Being prepared",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURN_REQUESTED: "Return requested",
  RETURNED: "Returned",
};

export const TRACK_STEPS: OrderStatus[] = ["CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];

type Tx = Prisma.TransactionClient;

/** Decrement inventory for every item of an order. Throws if any line is short. */
export async function reserveStock(tx: Tx, items: { kind: string; variantId?: string | null; quantity: number; hamperConfig?: unknown }[]) {
  for (const it of items) {
    if (it.kind === "PRODUCT" && it.variantId) {
      const r = await tx.variant.updateMany({ where: { id: it.variantId, stock: { gte: it.quantity } }, data: { stock: { decrement: it.quantity } } });
      if (r.count === 0) throw new Error("STOCK");
    } else if (it.kind === "HAMPER" && it.hamperConfig) {
      const cfg = it.hamperConfig as { box: { id: string }; components: { id: string; qty: number }[] };
      const b = await tx.hamperBox.updateMany({ where: { id: cfg.box.id, stock: { gte: it.quantity } }, data: { stock: { decrement: it.quantity } } });
      if (b.count === 0) throw new Error("STOCK");
      for (const c of cfg.components) {
        const n = c.qty * it.quantity;
        const r = await tx.hamperComponent.updateMany({ where: { id: c.id, stock: { gte: n } }, data: { stock: { decrement: n } } });
        if (r.count === 0) throw new Error("STOCK");
      }
    }
  }
}

/** Put inventory back (cancellation, failed payment, completed return). */
export async function restoreStock(orderId: string) {
  const items = await db.orderItem.findMany({ where: { orderId } });
  await db.$transaction(async (tx) => {
    for (const it of items) {
      if (it.kind === "PRODUCT" && it.variantId) {
        await tx.variant.updateMany({ where: { id: it.variantId }, data: { stock: { increment: it.quantity } } });
      } else if (it.kind === "HAMPER" && it.hamperConfig) {
        const cfg = it.hamperConfig as { box: { id: string }; components: { id: string; qty: number }[] };
        await tx.hamperBox.updateMany({ where: { id: cfg.box.id }, data: { stock: { increment: it.quantity } } });
        for (const c of cfg.components)
          await tx.hamperComponent.updateMany({ where: { id: c.id }, data: { stock: { increment: c.qty * it.quantity } } });
      }
    }
  });
}

export async function setOrderStatus(orderId: string, status: OrderStatus, note?: string) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.status === status) return order;
  const updated = await db.order.update({
    where: { id: orderId },
    data: { status, events: { create: { status, note } } },
  });
  if (status === "CANCELLED" && order.status !== "PENDING_PAYMENT") await restoreStock(orderId);
  return updated;
}

/** Called when payment is confirmed (Razorpay verify or webhook). Idempotent. */
export async function markOrderPaid(razorpayOrderId: string, paymentId: string) {
  const order = await db.order.findUnique({ where: { razorpayOrderId } });
  if (!order) return null;
  if (order.paymentStatus === "PAID") return order;
  const updated = await db.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: "PAID",
      razorpayPaymentId: paymentId,
      status: order.status === "PENDING_PAYMENT" ? "CONFIRMED" : order.status,
      events: order.status === "PENDING_PAYMENT" ? { create: { status: "CONFIRMED", note: "Payment received via Razorpay" } } : undefined,
    },
  });
  await bumpPopularity(order.id);
  return updated;
}

export async function bumpPopularity(orderId: string) {
  const items = await db.orderItem.findMany({ where: { orderId, productId: { not: null } }, select: { productId: true, quantity: true } });
  for (const it of items) await db.product.update({ where: { id: it.productId! }, data: { popularity: { increment: it.quantity } } });
}
