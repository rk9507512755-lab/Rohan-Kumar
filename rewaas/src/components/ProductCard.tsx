"use client";

import Link from "next/link";
import { useState } from "react";
import Img from "./Img";
import { useShop } from "./ShopProvider";
import { HeartIcon, PlusIcon } from "./icons";
import { discountPercent, inr } from "@/lib/money";
import { cn } from "@/lib/utils";

export type CardData = {
  id: string; slug: string; name: string; price: number; compareAtPrice: number | null; isNew: boolean; isBestseller: boolean;
  category: { name: string; slug: string };
  images: { url: string; alt: string | null }[];
  variants: { id: string; size: string; colour: string; colourHex: string; stock: number; price: number | null }[];
};

export default function ProductCard({ p, priority = false, sizes = "(min-width:1024px) 25vw, 50vw" }: { p: CardData; priority?: boolean; sizes?: string }) {
  const { wishlist, toggleWish, addToCart } = useShop();
  const [picking, setPicking] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const wished = wishlist.has(p.id);
  const off = discountPercent(p.price, p.compareAtPrice);
  const colours = [...new Map(p.variants.map((v) => [v.colour, v.colourHex])).entries()];
  const totalStock = p.variants.reduce((a, v) => a + Math.max(0, v.stock), 0);
  const soldOut = totalStock === 0;
  const sizes_ = [...new Set(p.variants.map((v) => v.size))];
  const firstColour = colours[0]?.[0];

  const quickAdd = async (variantId: string) => {
    setAdding(variantId);
    await addToCart(variantId, 1);
    setAdding(null);
    setPicking(false);
  };
  const onQuick = () => {
    const inStock = p.variants.filter((v) => v.stock > 0 && v.colour === firstColour);
    if (sizes_.length === 1 && inStock[0]) quickAdd(inStock[0].id);
    else setPicking((x) => !x);
  };

  return (
    <article className="group relative flex flex-col">
      <div className="relative aspect-[4/5] overflow-hidden bg-ivory-200">
        <Link href={`/products/${p.slug}`} aria-label={p.name} className="absolute inset-0">
          {p.images[0] && <Img src={p.images[0].url} alt={p.images[0].alt ?? p.name} fill priority={priority} sizes={sizes} className="img-zoom object-cover object-top" />}
          {p.images[1] && <Img src={p.images[1].url} alt="" fill sizes={sizes} className="object-cover opacity-0 transition-opacity duration-700 group-hover:opacity-100" />}
        </Link>
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1.5">
          {soldOut ? <span className="badge bg-ink text-ivory">Sold out</span> : p.isNew ? <span className="badge">New Arrival</span> : p.isBestseller ? <span className="badge">Bestseller</span> : null}
          {off >= 5 && !soldOut && <span className="badge bg-wine text-ivory">{off}% off</span>}
        </div>
        <button onClick={() => toggleWish(p.id)} aria-pressed={wished} aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          className={cn("absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-ivory/90 transition hover:bg-ivory", wished ? "text-wine" : "text-ink")}>
          <HeartIcon size={18} filled={wished} />
        </button>
        {!soldOut && (
          <div className={cn("absolute bottom-0 right-0 p-2.5 transition duration-300 lg:left-0 lg:p-3 lg:translate-y-3 lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100 lg:group-focus-within:translate-y-0 lg:group-focus-within:opacity-100", picking && "left-0")}>
            {picking ? (
              <div className="animate-fadeIn bg-ivory/95 p-3 backdrop-blur">
                <p className="mb-2 text-center text-[10px] uppercase tracking-[0.16em] text-ink-400">Select size{colours.length > 1 ? ` · ${firstColour}` : ""}</p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {p.variants.filter((v) => v.colour === firstColour).map((v) => (
                    <button key={v.id} disabled={v.stock <= 0 || !!adding} onClick={() => quickAdd(v.id)}
                      className="min-w-[38px] border border-ink-200 px-2 py-1.5 text-xs transition hover:border-wine hover:bg-wine hover:text-ivory disabled:cursor-not-allowed disabled:text-ink-200 disabled:line-through disabled:hover:border-ink-200 disabled:hover:bg-transparent">
                      {adding === v.id ? "…" : v.size}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <button onClick={onQuick} disabled={!!adding} aria-label={`Quick add ${p.name}`} className="flex h-10 w-10 items-center justify-center gap-2 rounded-full bg-ivory/95 text-ink shadow-sm backdrop-blur transition hover:bg-wine hover:text-ivory lg:h-auto lg:w-full lg:rounded-none lg:py-3 lg:text-[11px] lg:uppercase lg:tracking-[0.18em] lg:shadow-none">
                <PlusIcon size={16} /><span className="hidden lg:inline">{adding ? "Adding…" : "Quick Add"}</span>
              </button>
            )}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col pt-3.5">
        <p className="text-[10px] uppercase tracking-[0.18em] text-ink-300">{p.category.name}</p>
        <h3 className="mt-1 font-display text-[17px] leading-snug sm:text-lg">
          <Link href={`/products/${p.slug}`} className="hover:text-wine">{p.name}</Link>
        </h3>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="font-medium text-ink">{inr(p.price)}</span>
          {off > 0 && <><span className="text-ink-300 line-through">{inr(p.compareAtPrice!)}</span><span className="text-xs text-wine-400">{off}% off</span></>}
        </div>
        <div className="mt-2.5 flex items-center gap-1.5">
          {colours.slice(0, 5).map(([name, hex]) => <span key={name} title={name} className="h-3.5 w-3.5 rounded-full border border-ink/15 ring-1 ring-ivory ring-offset-0" style={{ background: hex }} />)}
          {colours.length > 1 && <span className="ml-1 text-[11px] text-ink-300">{colours.length} colours</span>}
          {!soldOut && totalStock <= 4 && <span className="ml-auto text-[11px] text-wine-400">Only {totalStock} left</span>}
        </div>
      </div>
    </article>
  );
}
