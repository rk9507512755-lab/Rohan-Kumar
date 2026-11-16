"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { restoreStock, setOrderStatus } from "@/lib/orders";
import { restoreItemStock } from "../../_lib/stock";
import { err, fail, fields, ok, zOpt, type FormState } from "../../_lib/form";

const NEXT: Record<string, string[]> = {
  REQUESTED: ["APPROVED", "REJECTED"],
  APPROVED: ["PICKED_UP", "REJECTED", "COMPLETED"],
  PICKED_UP: ["COMPLETED"],
  REJECTED: [],
  COMPLETED: [],
};

export async function updateReturn(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = z
    .object({ status: z.enum(["", "APPROVED", "REJECTED", "PICKED_UP", "COMPLETED"]).optional(), adminNote: zOpt(1000) })
    .safeParse(fields(fd));
  if (!parsed.success) return fail(parsed.error);
  const { status, adminNote } = parsed.data;
  const rr = await db.returnRequest.findUnique({ where: { id }, include: { order: { select: { id: true, status: true } } } });
  if (!rr) return err("Return request not found.");
  if (status && !NEXT[rr.status].includes(status)) return err(`A ${rr.status.toLowerCase().replace("_", " ")} request can't be moved to ${status.toLowerCase().replace("_", " ")}.`);

  await db.returnRequest.update({ where: { id }, data: { adminNote, ...(status && { status }) } });

  if (status === "COMPLETED") {
    if (rr.type === "RETURN") {
      if (rr.orderItemId) await restoreItemStock(rr.orderItemId);
      else await restoreStock(rr.orderId);
      await setOrderStatus(rr.orderId, "RETURNED", `Return completed${rr.orderItemId ? " (one item)" : ""}. Stock restored.`);
    } else {
      await db.orderEvent.create({ data: { orderId: rr.orderId, status: rr.order.status, note: `Exchange completed${rr.exchangeSize ? ` — size ${rr.exchangeSize}` : ""}` } });
    }
  } else if (status === "APPROVED" && rr.type === "RETURN" && rr.order.status === "DELIVERED") {
    await setOrderStatus(rr.orderId, "RETURN_REQUESTED", "Return approved — pickup to be scheduled");
  } else if (status === "REJECTED" && rr.order.status === "RETURN_REQUESTED") {
    await setOrderStatus(rr.orderId, "DELIVERED", `Return request rejected${adminNote ? `: ${adminNote}` : ""}`);
  }

  revalidatePath(`/admin/returns/${id}`);
  revalidatePath("/admin/returns");
  revalidatePath(`/admin/orders/${rr.orderId}`);
  return ok(status ? `Request marked ${status.toLowerCase().replace("_", " ")}.` : "Note saved.");
}
