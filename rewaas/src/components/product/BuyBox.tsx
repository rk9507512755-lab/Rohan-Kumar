"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useShop } from "@/components/ShopProvider";
import { QtyStepper } from "@/components/CartDrawer";
import { HeartIcon, PinIcon, RulerIcon, CloseIcon, TruckIcon, ReturnIcon, ShieldIcon } from "@/components/icons";
import { checkDelivery } from "@/app/actions/shop";
import type { PincodeResult } from "@/lib/pincode";
import { discountPercent, inr } from "@/lib/money";
import { cn } from "@/lib/utils";

type Variant = { id: string; size: string; colour: string; colourHex: string; stock: number; price: number | null };
type Chart = { title: string; note: string; columns: string[]; rows: (string | number)[][] } | undefined;

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "Free Size"];

function SizeGuide({ chart, onClose }: { chart: NonNullable<Chart>; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/40 sm:items-center" onClick={onClose} role="dialog" aria-modal="true" aria-label="Size guide">
      <div className="max-h-[88vh] w-full max-w-2xl animate-fadeUp overflow-y-auto bg-ivory p-6 sm:p-10" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div><p className="eyebrow">Size Guide</p><h2 className="mt-1 font-display text-3xl">{chart.title}</h2></div>
          <button onClick={onClose} aria-label="Close size guide"><CloseIcon /></button>
        </div>
        <p className="mt-3 text-sm text-ink-400">{chart.note}</p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead><tr className="border-b border-ink">{chart.columns.map((c) => <th key={c} className="py-3 pr-4 text-[11px] font-medium uppercase tracking-[0.14em]">{c}</th>)}</tr></thead>
            <tbody>{chart.rows.map((r) => <tr key={String(r[0])} className="border-b border-ink-200/70">{r.map((v, k) => <td key={k} className={cn("py-3 pr-4", k === 0 && "font-medium")}>{v}{k > 0 && typeof v === "number" ? "″" : ""}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <div className="mt-6 grid gap-4 bg-ivory-200 p-5 text-sm text-ink-400 sm:grid-cols-3">
          <p><strong className="block font-medium text-ink">Bust</strong>Around the fullest part of the chest.</p>
          <p><strong className="block font-medium text-ink">Waist</strong>Around the natural waistline.</p>
          <p><strong className="block font-medium text-ink">Hip</strong>Around the fullest part of the hips.</p>
        </div>
        <p className="mt-5 text-xs text-ink-400">Between sizes? We recommend sizing up. Our stylists can help on WhatsApp.</p>
      </div>
    </div>
  );
}

function PincodeChecker() {
  const [pin, setPin] = useState("");
  const [res, setRes] = useState<PincodeResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-ink"><PinIcon size={15} />Check delivery</p>
      <form onSubmit={(e) => { e.preventDefault(); start(async () => setRes(await checkDelivery(pin))); }} className="flex border border-ink-200 bg-white">
        <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="Enter PIN code" aria-label="PIN code" className="min-w-0 flex-1 px-3.5 py-3 text-sm outline-none" />
        <button disabled={pin.length !== 6 || pending} className="px-4 text-[11px] uppercase tracking-[0.16em] text-wine disabled:text-ink-300">{pending ? "…" : "Check"}</button>
      </form>
      {res && (res.ok ? (
        <p className="mt-2 text-sm text-ink-400">Delivery by <strong className="font-medium text-ink">{res.eta}</strong> to {res.pincode} · {res.cod ? "Cash on Delivery available" : "Prepaid orders only"}</p>
      ) : <p className="mt-2 text-sm text-wine">{res.error}</p>)}
    </div>
  );
}

export default function BuyBox({ product, variants, chart }: { product: { id: string; name: string; price: number; compareAtPrice: number | null; isHamper: boolean }; variants: Variant[]; chart: Chart }) {
  const colours = useMemo(() => [...new Map(variants.map((v) => [v.colour, v.colourHex])).entries()], [variants]);
  const firstAvailable = variants.find((v) => v.stock > 0);
  const [colour, setColour] = useState(firstAvailable?.colour ?? colours[0]?.[0]);
  const sizes = useMemo(() => variants.filter((v) => v.colour === colour).sort((a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size)), [variants, colour]);
  const single = sizes.length === 1;
  const [variantId, setVariantId] = useState<string | null>(single ? sizes[0]?.id ?? null : null);
  const [qty, setQty] = useState(1);
  const [err, setErr] = useState<string | null>(null);
  const [guide, setGuide] = useState(false);
  const [busy, setBusy] = useState<"add" | "buy" | null>(null);
  const { addToCart, wishlist, toggleWish } = useShop();
  const router = useRouter();
  const variant = variants.find((v) => v.id === variantId) ?? null;
  const price = variant?.price ?? product.price;
  const off = discountPercent(price, product.compareAtPrice);
  const wished = wishlist.has(product.id);
  const allOut = variants.every((v) => v.stock <= 0);

  const pickColour = (c: string) => {
    setColour(c);
    const same = variants.filter((v) => v.colour === c);
    const match = same.find((v) => v.size === variant?.size && v.stock > 0);
    setVariantId(match?.id ?? (same.length === 1 ? same[0].id : null));
    setQty(1);
  };
  const submit = async (mode: "add" | "buy") => {
    if (!variant) { setErr("Please select a size"); return; }
    setErr(null);
    setBusy(mode);
    const ok = await addToCart(variant.id, qty, { silent: mode === "buy" });
    setBusy(null);
    if (ok && mode === "buy") router.push("/checkout");
  };

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-2xl font-medium text-ink">{inr(price)}</span>
        {off > 0 && <><span className="text-lg text-ink-300 line-through">{inr(product.compareAtPrice!)}</span><span className="bg-wine-50 px-2 py-0.5 text-xs font-medium text-wine-700">{off}% OFF</span></>}
      </div>
      <p className="mt-1 text-xs text-ink-400">MRP inclusive of all taxes · Free shipping above ₹1,999</p>

      {colours.length > 0 && (
        <div className="mt-8">
          <p className="mb-3 text-[11px] uppercase tracking-[0.16em] text-ink-400">Colour: <span className="text-ink">{colour}</span></p>
          <div className="flex flex-wrap gap-2.5">
            {colours.map(([name, hex]) => {
              const out = variants.filter((v) => v.colour === name).every((v) => v.stock <= 0);
              return (
                <button key={name} onClick={() => pickColour(name)} aria-label={`${name}${out ? " (sold out)" : ""}`} aria-pressed={colour === name} title={name}
                  className={cn("relative h-9 w-9 rounded-full border border-ink/15 transition", colour === name ? "ring-1 ring-ink ring-offset-[3px] ring-offset-ivory" : "hover:scale-105", out && "opacity-40")} style={{ background: hex }}>
                  {out && <span className="absolute left-1/2 top-1/2 h-px w-10 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-ink/60" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!single && (
        <div className="mt-7">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-400">Size{variant ? <>: <span className="text-ink">{variant.size}</span></> : null}</p>
            {chart && <button onClick={() => setGuide(true)} className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-wine underline-offset-4 hover:underline"><RulerIcon size={15} />Size guide</button>}
          </div>
          <div className="flex flex-wrap gap-2">
            {sizes.map((v) => (
              <button key={v.id} disabled={v.stock <= 0} onClick={() => { setVariantId(v.id); setErr(null); setQty(1); }} aria-pressed={variantId === v.id}
                className={cn("min-w-[52px] border px-3 py-2.5 text-sm transition", variantId === v.id ? "border-wine bg-wine text-ivory" : "border-ink-200 bg-white hover:border-ink", v.stock <= 0 && "cursor-not-allowed text-ink-200 line-through hover:border-ink-200")}>
                {v.size}
              </button>
            ))}
          </div>
          {variant && variant.stock <= 3 && <p className="mt-2 text-xs text-wine">Only {variant.stock} left in {variant.size} — order soon</p>}
          {err && <p className="mt-2 text-xs text-wine" role="alert">{err}</p>}
        </div>
      )}
      {single && chart && <button onClick={() => setGuide(true)} className="mt-6 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-wine underline-offset-4 hover:underline"><RulerIcon size={15} />Blouse size guide</button>}
      {single && variant && variant.stock > 0 && variant.stock <= 3 && <p className="mt-3 text-xs text-wine">Only {variant.stock} left — order soon</p>}

      <div className="mt-8 flex items-center gap-3">
        <QtyStepper value={qty} max={Math.max(1, Math.min(10, variant?.stock ?? 10))} onChange={setQty} />
        <button onClick={() => toggleWish(product.id)} aria-pressed={wished} className={cn("flex h-[42px] items-center gap-2 border px-4 text-[11px] uppercase tracking-[0.14em] transition", wished ? "border-wine text-wine" : "border-ink-200 hover:border-ink")}>
          <HeartIcon size={17} filled={wished} />{wished ? "Saved" : "Wishlist"}
        </button>
      </div>
      {allOut ? (
        <div className="mt-4 border border-ink-200 bg-white p-4 text-sm text-ink-400">This piece is currently sold out. Message us on WhatsApp to be notified when it&apos;s back.</div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button onClick={() => submit("add")} disabled={!!busy || (variant?.stock ?? 1) <= 0} className="btn-outline w-full py-4">{busy === "add" ? "Adding…" : "Add to Bag"}</button>
          <button onClick={() => submit("buy")} disabled={!!busy || (variant?.stock ?? 1) <= 0} className="btn-primary w-full py-4">{busy === "buy" ? "Please wait…" : "Buy Now"}</button>
        </div>
      )}

      <div className="mt-8 border-t border-ink-200/70 pt-6"><PincodeChecker /></div>
      <ul className="mt-6 grid grid-cols-3 gap-2 text-center text-[10px] uppercase tracking-[0.12em] text-ink-400">
        <li className="flex flex-col items-center gap-2"><TruckIcon size={20} className="text-gold-600" />Ships in 1–2 days</li>
        <li className="flex flex-col items-center gap-2"><ReturnIcon size={20} className="text-gold-600" />{product.isHamper ? "Gift-ready packing" : "7-day exchange"}</li>
        <li className="flex flex-col items-center gap-2"><ShieldIcon size={20} className="text-gold-600" />Secure payments</li>
      </ul>
      {guide && chart && <SizeGuide chart={chart} onClose={() => setGuide(false)} />}
    </div>
  );
}
