import "server-only";
import { db } from "./db";
import { getOwner } from "./visitor";
import { getSettings } from "./settings";
import { computeTotals, evaluateCoupon, gstRateFor } from "./pricing";
import { resolveHamper, type ResolvedHamper } from "./hamper";

export type CartLine = {
  id: string;
  kind: "PRODUCT" | "HAMPER";
  productId?: string;
  variantId?: string;
  slug?: string;
  name: string;
  image: string;
  size?: string;
  colour?: string;
  sku?: string;
  unitPrice: number;
  compareAtPrice?: number | null;
  quantity: number;
  maxQty: number;
  gstRate: number;
  hamper?: ResolvedHamper;
  issue?: string; // stock / availability problems
};

export async function findCart(create = false) {
  const owner = await getOwner();
  if (!owner.userId && !owner.visitorId) return null;
  const where = owner.userId ? { userId: owner.userId } : { visitorId: owner.visitorId };
  let cart = await db.cart.findFirst({ where, orderBy: { updatedAt: "desc" } });
  if (!cart && create) cart = await db.cart.create({ data: owner.userId ? { userId: owner.userId } : { visitorId: owner.visitorId } });
  return cart;
}

export async function getCartView() {
  const settings = await getSettings();
  const cart = await findCart(false);
  const empty = { cartId: null as string | null, lines: [] as CartLine[], count: 0, couponCode: null as string | null, couponError: null as string | null, totals: computeTotals([], settings) };
  if (!cart) return empty;
  const items = await db.cartItem.findMany({
    where: { cartId: cart.id },
    orderBy: { createdAt: "asc" },
    include: {
      product: { select: { id: true, slug: true, name: true, price: true, compareAtPrice: true, status: true, gstRate: true, images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } } } },
      variant: true,
    },
  });
  const lines: CartLine[] = [];
  for (const it of items) {
    if (it.kind === "HAMPER") {
      const r = await resolveHamper(it.hamperConfig, it.quantity);
      if (!r.ok) {
        lines.push({ id: it.id, kind: "HAMPER", name: "Custom Hamper", image: "/images/gift-studio/box-signature.svg", unitPrice: 0, quantity: it.quantity, maxQty: 0, gstRate: 18, issue: r.error });
        continue;
      }
      lines.push({
        id: it.id, kind: "HAMPER", name: r.hamper.name, image: r.hamper.image, unitPrice: r.hamper.unitPrice, quantity: it.quantity,
        maxQty: 10, gstRate: gstRateFor({ unitPrice: r.hamper.unitPrice, isHamper: true }, settings), hamper: r.hamper,
      });
      continue;
    }
    const p = it.product, v = it.variant;
    if (!p || !v) continue;
    const unitPrice = v.price ?? p.price;
    let issue: string | undefined;
    if (p.status !== "ACTIVE") issue = "This item is no longer available.";
    else if (v.stock <= 0) issue = "Out of stock";
    else if (v.stock < it.quantity) issue = `Only ${v.stock} left — quantity adjusted at checkout.`;
    lines.push({
      id: it.id, kind: "PRODUCT", productId: p.id, variantId: v.id, slug: p.slug, name: p.name, image: p.images[0]?.url ?? "",
      size: v.size, colour: v.colour, sku: v.sku, unitPrice, compareAtPrice: p.compareAtPrice, quantity: it.quantity,
      maxQty: Math.max(0, Math.min(10, v.stock)), issue,
      gstRate: gstRateFor({ unitPrice, isHamper: false, override: p.gstRate }, settings),
    });
  }
  const valid = lines.filter((l) => !l.issue || l.issue.startsWith("Only"));
  const subtotal = valid.reduce((a, l) => a + l.unitPrice * l.quantity, 0);
  let discount = 0, couponError: string | null = null;
  if (cart.couponCode) {
    const coupon = await db.coupon.findUnique({ where: { code: cart.couponCode } });
    const r = evaluateCoupon(coupon, subtotal);
    if (r.ok) discount = r.discount;
    else couponError = r.error;
  }
  return {
    cartId: cart.id,
    lines,
    count: lines.reduce((a, l) => a + l.quantity, 0),
    couponCode: cart.couponCode,
    couponError,
    totals: computeTotals(valid, settings, { discount }),
  };
}
export type CartView = Awaited<ReturnType<typeof getCartView>>;

export async function cartCount(): Promise<number> {
  const cart = await findCart(false);
  if (!cart) return 0;
  const agg = await db.cartItem.aggregate({ where: { cartId: cart.id }, _sum: { quantity: true } });
  return agg._sum.quantity ?? 0;
}
