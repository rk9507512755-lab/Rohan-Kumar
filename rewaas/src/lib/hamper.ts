import "server-only";
import { z } from "zod";
import { db } from "./db";

export const hamperConfigSchema = z.object({
  boxId: z.string().min(1),
  components: z.array(z.object({ id: z.string().min(1), qty: z.number().int().min(1).max(10) })).min(1, "Choose at least one item"),
  packagingId: z.string().min(1),
  recipientName: z.string().trim().max(60).optional().default(""),
  message: z.string().trim().max(300).optional().default(""),
  senderName: z.string().trim().max(60).optional().default(""),
});
export type HamperConfig = z.infer<typeof hamperConfigSchema>;

export type ResolvedHamper = {
  config: HamperConfig;
  box: { id: string; name: string; image: string; price: number; capacity: number };
  components: { id: string; name: string; image: string; price: number; qty: number; group: string }[];
  packaging: { id: string; name: string; price: number };
  unitPrice: number;
  name: string;
  image: string;
};

/** Validates a hamper configuration against live inventory & pricing. Prices always come from the DB. */
export async function resolveHamper(raw: unknown, quantity = 1): Promise<{ ok: true; hamper: ResolvedHamper } | { ok: false; error: string }> {
  const parsed = hamperConfigSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid hamper" };
  const cfg = parsed.data;
  const [box, packaging, comps] = await Promise.all([
    db.hamperBox.findFirst({ where: { id: cfg.boxId, active: true } }),
    db.packagingOption.findFirst({ where: { id: cfg.packagingId, active: true } }),
    db.hamperComponent.findMany({ where: { id: { in: cfg.components.map((c) => c.id) }, active: true } }),
  ]);
  if (!box) return { ok: false, error: "The selected hamper box is no longer available." };
  if (!packaging) return { ok: false, error: "The selected packaging is no longer available." };
  if (box.stock < quantity) return { ok: false, error: `Only ${box.stock} ${box.name} box(es) left in stock.` };
  const units = cfg.components.reduce((a, c) => a + c.qty, 0);
  if (units > box.capacity) return { ok: false, error: `${box.name} holds up to ${box.capacity} items.` };
  const resolved: ResolvedHamper["components"] = [];
  for (const c of cfg.components) {
    const comp = comps.find((x) => x.id === c.id);
    if (!comp) return { ok: false, error: "One of the selected items is no longer available." };
    if (c.qty > comp.maxPerHamper) return { ok: false, error: `Up to ${comp.maxPerHamper} × ${comp.name} per hamper.` };
    if (comp.stock < c.qty * quantity) return { ok: false, error: `Only ${comp.stock} × ${comp.name} left in stock.` };
    resolved.push({ id: comp.id, name: comp.name, image: comp.image, price: comp.price, qty: c.qty, group: comp.group });
  }
  const unitPrice = box.price + packaging.price + resolved.reduce((a, c) => a + c.price * c.qty, 0);
  return {
    ok: true,
    hamper: {
      config: cfg,
      box: { id: box.id, name: box.name, image: box.image, price: box.price, capacity: box.capacity },
      components: resolved,
      packaging: { id: packaging.id, name: packaging.name, price: packaging.price },
      unitPrice,
      name: `Custom Hamper — ${box.name}`,
      image: box.image,
    },
  };
}
