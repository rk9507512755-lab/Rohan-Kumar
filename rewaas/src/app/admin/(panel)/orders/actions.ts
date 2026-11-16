"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { OrderStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { setOrderStatus } from "@/lib/orders";
import { err, fail, fields, ok, zDate, zOpt, type FormState } from "../../_lib/form";

const STATUSES = ["PENDING_PAYMENT", "CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "RETURN_REQUESTED", "RETURNED"] as const;

function touch(id: string) {
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

export async function updateOrderStatus(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = z
    .object({ status: z.enum(STATUSES, { errorMap: () => ({ message: "Choose a status" }) }), note: zOpt(500) })
    .safeParse(fields(fd));
  if (!parsed.success) return fail(parsed.error);
  const order = await db.order.findUnique({ where: { id }, select: { status: true } });
  if (!order) return err("Order not found.");
  if (order.status === "CANCELLED") return err("This order is cancelled; its status can no longer be changed.");
  if (order.status === parsed.data.status) return err("The order already has this status.");
  await setOrderStatus(id, parsed.data.status as OrderStatus, parsed.data.note ?? undefined);
  touch(id);
  return ok("Status updated.");
}

export async function updateShipping(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = z.object({ courier: zOpt(80), trackingNumber: zOpt(80), estimatedDelivery: zDate }).safeParse(fields(fd));
  if (!parsed.success) return fail(parsed.error);
  await db.order.update({ where: { id }, data: parsed.data });
  touch(id);
  return ok("Shipping details saved.");
}

export async function cancelOrder(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = z.object({ reason: z.string().trim().min(3, "Give a short reason for the cancellation").max(500) }).safeParse(fields(fd));
  if (!parsed.success) return fail(parsed.error);
  const order = await db.order.findUnique({ where: { id }, select: { status: true } });
  if (!order) return err("Order not found.");
  if (order.status === "CANCELLED") return err("This order is already cancelled.");
  if (["DELIVERED", "RETURNED"].includes(order.status)) return err("Delivered orders can't be cancelled — use a return instead.");
  await db.order.update({ where: { id }, data: { cancelReason: parsed.data.reason } });
  await setOrderStatus(id, "CANCELLED", `Cancelled by store: ${parsed.data.reason}`);
  touch(id);
  return ok("Order cancelled and stock restored.");
}

export async function setPaymentStatus(id: string, to: "PAID" | "REFUNDED", _prev: FormState, _fd: FormData): Promise<FormState> {
  await requireAdmin();
  const order = await db.order.findUnique({ where: { id } });
  if (!order) return err("Order not found.");
  if (to === "PAID" && (order.paymentMethod !== "COD" || order.paymentStatus === "PAID")) return err("Only unpaid COD orders can be marked as paid.");
  if (to === "REFUNDED" && order.paymentStatus !== "PAID") return err("Only paid orders can be marked as refunded.");
  await db.order.update({
    where: { id },
    data: {
      paymentStatus: to,
      events: { create: { status: order.status, note: to === "PAID" ? "Cash on delivery payment received" : "Payment refunded to customer" } },
    },
  });
  touch(id);
  return ok(to === "PAID" ? "Marked as paid." : "Marked as refunded.");
}
