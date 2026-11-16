"use client";

import Link from "next/link";
import ProductCard, { type CardData } from "@/components/ProductCard";
import { useShop } from "@/components/ShopProvider";

/** Hides cards as soon as they're un-hearted, so the wishlist feels live. */
export default function WishlistGrid({ products }: { products: CardData[] }) {
  const { wishlist } = useShop();
  const visible = products.filter((p) => wishlist.has(p.id));
  if (!visible.length)
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="font-display text-2xl">Your wishlist is empty</p>
        <p className="lead mt-3">Tap the heart on any piece you love and it will wait for you here.</p>
        <Link href="/collections/new-arrivals" className="btn-primary mt-8">Discover new arrivals</Link>
      </div>
    );
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
      {visible.map((p, i) => <ProductCard key={p.id} p={p} priority={i < 4} />)}
    </div>
  );
}
