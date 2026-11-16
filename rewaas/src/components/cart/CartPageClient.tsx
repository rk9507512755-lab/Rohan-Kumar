"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import Img from "@/components/Img";
import { useShop } from "@/components/ShopProvider";
import { FreeShippingBar, LineDetails, QtyStepper } from "@/components/CartDrawer";
import { applyCoupon, removeCartItem, removeCoupon, updateCartItem } from "@/app/actions/shop";
import type { CartView } from "@/lib/cart";
import { inr } from "@/lib/money";

export function CouponBox({ cart, onCart }: { cart: CartView; onCart: (c: CartView) => void }) {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  if (cart.couponCode && !cart.couponError)
    return (
      <div className="flex items-center justify-between border border-dashed border-gold bg-ivory-200/60 px-4 py-3 text-sm">
        <span><span className="font-medium tracking-wide">{cart.couponCode}</span> applied · you save {inr(cart.totals.discount)}</span>
        <button disabled={pending} onClick={() => start(async () => { const r = await removeCoupon(); if (r.cart) onCart(r.cart); setMsg(null); })} className="text-xs text-wine underline">Remove</button>
      </div>
    );
  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await applyCoupon(code); if (r.cart) onCart(r.cart); setMsg(r.ok ? { ok: true, text: r.message ?? "Applied" } : { ok: false, text: r.error }); }); }} className="flex border border-ink-200 bg-white">
        <label htmlFor="coupon" className="sr-only">Coupon code</label>
        <input id="coupon" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Coupon code" className="min-w-0 flex-1 px-3.5 py-3 text-sm uppercase tracking-wide outline-none placeholder:normal-case placeholder:tracking-normal" />
        <button disabled={!code || pending} className="px-4 text-[11px] uppercase tracking-[0.16em] text-wine disabled:text-ink-300">{pending ? "…" : "Apply"}</button>
      </form>
      {cart.couponError && <p className="mt-2 text-xs text-wine">{cart.couponCode}: {cart.couponError}</p>}
      {msg && <p className={`mt-2 text-xs ${msg.ok ? "text-ink-400" : "text-wine"}`}>{msg.text}</p>}
      <p className="mt-2 text-[11px] text-ink-300">Try WELCOME10 on your first order.</p>
    </div>
  );
}

export default function CartPageClient({ initial }: { initial: CartView }) {
  const { setCart: setShared, toast } = useShop();
  const [cart, setLocal] = useState(initial);
  const [busy, start] = useTransition();
  const setCart = (c: CartView) => { setLocal(c); setShared(c); };
  useEffect(() => { setShared(initial); }, [initial, setShared]);
  const update = (id: string, q: number) => start(async () => {
    const r = q <= 0 ? await removeCartItem(id) : await updateCartItem(id, q);
    if (r.cart) setCart(r.cart);
    if (!r.ok) toast(r.error, "error");
  });
  const blocked = cart.lines.some((l) => l.issue && !l.issue.startsWith("Only"));

  if (!cart.lines.length)
    return (
      <div className="py-24 text-center">
        <h1 className="h-display">Your bag is empty</h1>
        <p className="lead mt-3">Beautiful things are waiting to be discovered.</p>
        <div className="mt-8 flex justify-center gap-3"><Link href="/collections/new-arrivals" className="btn-primary">Shop New Arrivals</Link><Link href="/gift-studio" className="btn-outline">Visit Gift Studio</Link></div>
      </div>
    );

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_400px] lg:gap-16">
      <div>
        <h1 className="h-section">Your Bag <span className="font-sans text-base text-ink-400">({cart.count} {cart.count === 1 ? "item" : "items"})</span></h1>
        <div className="mt-6"><FreeShippingBar remaining={cart.totals.freeShippingRemaining} /></div>
        <ul className={`mt-8 divide-y divide-ink-200/70 border-y border-ink-200/70 ${busy ? "opacity-60" : ""}`}>
          {cart.lines.map((l) => (
            <li key={l.id} className="flex gap-5 py-6">
              <Link href={l.slug ? `/products/${l.slug}` : "/gift-studio/create"} className="relative h-40 w-32 shrink-0 overflow-hidden bg-ivory-200 sm:h-48 sm:w-40">
                {l.image && <Img src={l.image} alt={l.name} fill sizes="160px" className="object-cover object-top" />}
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex flex-col justify-between gap-1 sm:flex-row sm:gap-4">
                  <div>
                    <p className="font-display text-xl leading-snug">{l.slug ? <Link href={`/products/${l.slug}`} className="hover:text-wine">{l.name}</Link> : l.name}</p>
                    <LineDetails line={l} />
                    {l.sku && <p className="mt-1 text-[11px] text-ink-300">SKU {l.sku}</p>}
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-medium">{inr(l.unitPrice * l.quantity)}</p>
                    {l.quantity > 1 && <p className="text-xs text-ink-400">{inr(l.unitPrice)} each</p>}
                    {l.compareAtPrice && l.compareAtPrice > l.unitPrice && <p className="text-xs text-ink-300 line-through">{inr(l.compareAtPrice * l.quantity)}</p>}
                  </div>
                </div>
                {l.issue && <p className="mt-2 text-xs text-wine">{l.issue}</p>}
                <div className="mt-auto flex items-center gap-5 pt-4">
                  <QtyStepper value={l.quantity} max={l.maxQty || 1} onChange={(q) => update(l.id, q)} disabled={busy} />
                  <button onClick={() => update(l.id, 0)} className="text-[11px] uppercase tracking-[0.14em] text-ink-400 hover:text-wine">Remove</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <Link href="/collections/all" className="mt-6 inline-block text-[11px] uppercase tracking-[0.18em] text-wine underline-offset-4 hover:underline">← Continue shopping</Link>
      </div>
      <aside className="h-fit bg-white p-6 sm:p-8 lg:sticky lg:top-32">
        <h2 className="font-display text-2xl">Order Summary</h2>
        <div className="mt-6"><CouponBox cart={cart} onCart={setCart} /></div>
        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex justify-between"><dt className="text-ink-400">Subtotal</dt><dd>{inr(cart.totals.subtotal)}</dd></div>
          {cart.totals.discount > 0 && <div className="flex justify-between text-wine"><dt>Coupon discount</dt><dd>−{inr(cart.totals.discount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-ink-400">Shipping</dt><dd>{cart.totals.shippingFee ? inr(cart.totals.shippingFee) : "Complimentary"}</dd></div>
          <div className="flex justify-between border-t border-ink-200/70 pt-4 text-base"><dt className="font-medium">Total</dt><dd className="font-medium">{inr(cart.totals.total)}</dd></div>
          <p className="text-xs text-ink-400">Includes GST of {inr(cart.totals.taxAmount)}</p>
        </dl>
        {blocked ? <p className="mt-6 text-sm text-wine">Please remove unavailable items to continue.</p> : <Link href="/checkout" className="btn-primary mt-6 w-full py-4">Proceed to Checkout</Link>}
        <p className="mt-4 text-center text-[11px] uppercase tracking-[0.14em] text-ink-300">UPI · Cards · Net Banking · Wallets · COD</p>
      </aside>
    </div>
  );
}
