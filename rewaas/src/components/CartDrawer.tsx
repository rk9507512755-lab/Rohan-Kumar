"use client";

import Link from "next/link";
import { useTransition } from "react";
import Img from "./Img";
import { useShop } from "./ShopProvider";
import { CloseIcon, MinusIcon, PlusIcon, TruckIcon } from "./icons";
import { inr } from "@/lib/money";
import { removeCartItem, updateCartItem } from "@/app/actions/shop";
import type { CartLine } from "@/lib/cart";

export function QtyStepper({ value, max, onChange, disabled }: { value: number; max: number; onChange: (n: number) => void; disabled?: boolean }) {
  return (
    <div className="inline-flex items-center border border-ink-200">
      <button type="button" className="p-2 disabled:opacity-40" onClick={() => onChange(value - 1)} disabled={disabled || value <= 1} aria-label="Decrease quantity"><MinusIcon size={14} /></button>
      <span className="w-8 text-center text-sm" aria-live="polite">{value}</span>
      <button type="button" className="p-2 disabled:opacity-40" onClick={() => onChange(value + 1)} disabled={disabled || value >= max} aria-label="Increase quantity"><PlusIcon size={14} /></button>
    </div>
  );
}

export function LineDetails({ line }: { line: CartLine }) {
  if (line.kind === "HAMPER" && line.hamper) {
    return (
      <p className="mt-1 text-xs leading-relaxed text-ink-400">
        {line.hamper.components.map((c) => `${c.name}${c.qty > 1 ? ` ×${c.qty}` : ""}`).join(" · ")}
        <br />{line.hamper.packaging.name}{line.hamper.config.message ? ` · Message: “${line.hamper.config.message.slice(0, 40)}${line.hamper.config.message.length > 40 ? "…" : ""}”` : ""}
      </p>
    );
  }
  return <p className="mt-1 text-xs text-ink-400">{[line.colour, line.size].filter(Boolean).join(" · ")}</p>;
}

export function FreeShippingBar({ remaining, threshold = 199900 }: { remaining: number; threshold?: number }) {
  const pct = Math.min(100, Math.round(((threshold - remaining) / threshold) * 100));
  return (
    <div>
      <p className="flex items-center gap-2 text-xs text-ink-400">
        <TruckIcon size={16} className="text-gold-600" />
        {remaining > 0 ? <>You&apos;re <strong className="font-medium text-ink">{inr(remaining)}</strong> away from complimentary shipping</> : <span className="text-ink">You&apos;ve unlocked complimentary shipping</span>}
      </p>
      <div className="mt-2 h-[3px] w-full bg-ink-200/60"><div className="h-full bg-gold transition-all duration-500" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export default function CartDrawer() {
  const { cart, setCart, drawerOpen, closeDrawer, pending, toast } = useShop();
  const [busy, start] = useTransition();
  if (!drawerOpen) return null;
  const update = (id: string, q: number) => start(async () => {
    const r = q <= 0 ? await removeCartItem(id) : await updateCartItem(id, q);
    if (r.cart) setCart(r.cart);
    if (!r.ok) toast(r.error, "error");
  });
  return (
    <div className="fixed inset-0 z-[75]" role="dialog" aria-modal="true" aria-label="Shopping bag">
      <div className="absolute inset-0 animate-fadeIn bg-ink/40" onClick={closeDrawer} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[440px] animate-slideIn flex-col bg-ivory shadow-2xl">
        <div className="flex items-center justify-between border-b border-ink-200/70 px-6 py-5">
          <h2 className="font-display text-2xl">Your Bag {cart ? <span className="text-base text-ink-400">({cart.count})</span> : null}</h2>
          <button onClick={closeDrawer} aria-label="Close bag" className="p-1"><CloseIcon /></button>
        </div>
        {!cart && pending ? (
          <div className="flex flex-1 items-center justify-center text-sm text-ink-400">Loading your bag…</div>
        ) : !cart || cart.lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <p className="font-display text-3xl">Your bag is empty</p>
            <p className="lead mt-2">Discover pieces crafted to be treasured.</p>
            <Link href="/collections/new-arrivals" onClick={closeDrawer} className="btn-primary mt-6">Shop New Arrivals</Link>
          </div>
        ) : (
          <>
            <div className="border-b border-ink-200/70 px-6 py-4"><FreeShippingBar remaining={cart.totals.freeShippingRemaining} /></div>
            <ul className={`flex-1 divide-y divide-ink-200/60 overflow-y-auto px-6 ${busy ? "opacity-60" : ""}`}>
              {cart.lines.map((l) => (
                <li key={l.id} className="flex gap-4 py-5">
                  <Link href={l.slug ? `/products/${l.slug}` : "/gift-studio/create"} onClick={closeDrawer} className="relative h-28 w-[88px] shrink-0 overflow-hidden bg-ivory-200">
                    {l.image && <Img src={l.image} alt={l.name} fill sizes="90px" className="object-cover" />}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex justify-between gap-3">
                      <p className="font-display text-[17px] leading-snug">{l.name}</p>
                      <p className="whitespace-nowrap text-sm">{inr(l.unitPrice * l.quantity)}</p>
                    </div>
                    <LineDetails line={l} />
                    {l.issue && <p className="mt-1 text-xs text-wine-400">{l.issue}</p>}
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <QtyStepper value={l.quantity} max={l.maxQty || 1} onChange={(q) => update(l.id, q)} disabled={busy} />
                      <button onClick={() => update(l.id, 0)} className="text-[11px] uppercase tracking-[0.14em] text-ink-400 underline-offset-4 hover:text-wine hover:underline">Remove</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-ink-200/70 bg-white px-6 py-5">
              <div className="flex justify-between text-sm"><span className="text-ink-400">Subtotal</span><span>{inr(cart.totals.subtotal)}</span></div>
              {cart.totals.discount > 0 && <div className="mt-1 flex justify-between text-sm text-wine"><span>Discount ({cart.couponCode})</span><span>−{inr(cart.totals.discount)}</span></div>}
              <p className="mt-1 text-xs text-ink-300">Inclusive of GST. Shipping calculated at checkout.</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Link href="/cart" onClick={closeDrawer} className="btn-outline btn-sm py-3.5">View Bag</Link>
                <Link href="/checkout" onClick={closeDrawer} className="btn-primary btn-sm py-3.5">Checkout</Link>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
