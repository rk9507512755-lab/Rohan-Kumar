import "server-only";
import { db } from "@/lib/db";

/** Put a single order line back into inventory (mirrors restoreStock() in lib/orders for one item). */
export async function restoreItemStock(orderItemId: string) {
  const it = await db.orderItem.findUnique({ where: { id: orderItemId } });
  if (!it) return;
  await db.$transaction(async (tx) => {
    if (it.kind === "PRODUCT" && it.variantId) {
      await tx.variant.updateMany({ where: { id: it.variantId }, data: { stock: { increment: it.quantity } } });
    } else if (it.kind === "HAMPER" && it.hamperConfig) {
      const cfg = it.hamperConfig as { box?: { id: string }; components?: { id: string; qty: number }[] };
      if (cfg.box?.id) await tx.hamperBox.updateMany({ where: { id: cfg.box.id }, data: { stock: { increment: it.quantity } } });
      for (const c of cfg.components ?? []) await tx.hamperComponent.updateMany({ where: { id: c.id }, data: { stock: { increment: c.qty * it.quantity } } });
    }
  });
}
