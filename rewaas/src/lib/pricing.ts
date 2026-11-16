import type { Coupon } from "@prisma/client";
import { num, type Settings } from "./settings";

export type PricedLine = {
  unitPrice: number;
  quantity: number;
  gstRate: number;
};

export function gstRateFor(opts: { unitPrice: number; isHamper: boolean; override?: number | null }, s: Settings): number {
  if (opts.override) return opts.override;
  if (opts.isHamper) return num(s.hamperGst);
  return opts.unitPrice <= num(s.apparelGstThreshold) ? num(s.apparelGstLow) : num(s.apparelGstHigh);
}

/** Prices are GST-inclusive (Indian retail convention). Returns the GST component contained in an amount. */
export function includedTax(amount: number, ratePct: number): number {
  return Math.round(amount - amount / (1 + ratePct / 100));
}

export type CouponResult = { ok: true; discount: number; coupon: Coupon } | { ok: false; error: string };

export function evaluateCoupon(coupon: Coupon | null, subtotal: number, now = new Date()): CouponResult {
  if (!coupon || !coupon.active) return { ok: false, error: "This coupon code is not valid." };
  if (coupon.startsAt && coupon.startsAt > now) return { ok: false, error: "This coupon is not active yet." };
  if (coupon.endsAt && coupon.endsAt < now) return { ok: false, error: "This coupon has expired." };
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) return { ok: false, error: "This coupon has reached its usage limit." };
  if (subtotal < coupon.minSubtotal)
    return { ok: false, error: `Add items worth ₹${Math.ceil((coupon.minSubtotal - subtotal) / 100).toLocaleString("en-IN")} more to use this coupon.` };
  let discount = coupon.type === "PERCENT" ? Math.round((subtotal * coupon.value) / 100) : coupon.value;
  if (coupon.maxDiscount != null) discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.min(discount, subtotal);
  return { ok: true, discount, coupon };
}

export type Totals = {
  subtotal: number;
  discount: number;
  shippingFee: number;
  codFee: number;
  giftWrapFee: number;
  taxAmount: number;
  total: number;
  freeShippingRemaining: number;
};

export function computeTotals(
  lines: PricedLine[],
  s: Settings,
  opts: { discount?: number; cod?: boolean; giftWrap?: boolean } = {},
): Totals {
  const subtotal = lines.reduce((a, l) => a + l.unitPrice * l.quantity, 0);
  const discount = Math.min(opts.discount ?? 0, subtotal);
  const afterDiscount = subtotal - discount;
  const threshold = num(s.freeShippingThreshold);
  const shippingFee = subtotal === 0 || afterDiscount >= threshold ? 0 : num(s.shippingFee);
  const codFee = opts.cod ? num(s.codFee) : 0;
  const giftWrapFee = opts.giftWrap ? num(s.giftWrapFee) : 0;
  // GST included in item prices, apportioned after discount
  const ratio = subtotal ? afterDiscount / subtotal : 0;
  const taxAmount = lines.reduce((a, l) => a + includedTax(l.unitPrice * l.quantity * ratio, l.gstRate), 0);
  return {
    subtotal,
    discount,
    shippingFee,
    codFee,
    giftWrapFee,
    taxAmount,
    total: afterDiscount + shippingFee + codFee + giftWrapFee,
    freeShippingRemaining: Math.max(0, threshold - afterDiscount),
  };
}
