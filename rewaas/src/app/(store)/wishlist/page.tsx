import type { Metadata } from "next";
import Link from "next/link";
import WishlistGrid from "@/components/account/WishlistGrid";
import { HeartIcon } from "@/components/icons";
import { db } from "@/lib/db";
import { cardSelect } from "@/lib/catalog";
import { getOwner } from "@/lib/visitor";

export const metadata: Metadata = { title: "Wishlist", description: "The REWAAS pieces you've saved.", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const owner = await getOwner();
  const where = owner.userId ? { userId: owner.userId } : owner.visitorId ? { visitorId: owner.visitorId } : null;
  const items = where
    ? await db.wishlistItem.findMany({ where: { ...where, product: { status: "ACTIVE" } }, orderBy: { createdAt: "desc" }, include: { product: { select: cardSelect } } })
    : [];
  const products = items.map((i) => i.product);
  return (
    <div className="container-site py-12 sm:py-16">
      <header className="mx-auto mb-12 max-w-2xl text-center">
        <p className="eyebrow">Saved for later</p>
        <h1 className="h-section mt-3">Your Wishlist</h1>
        <div className="divider-ornament my-4 text-xs">✦</div>
        <p className="lead">{products.length ? `${products.length} piece${products.length > 1 ? "s" : ""} you love, all in one place.` : "Pieces you love, all in one place."}</p>
      </header>
      {!owner.userId && (
        <div className="mx-auto mb-12 flex max-w-3xl flex-col items-center gap-4 border border-gold/40 bg-ivory-200 px-6 py-5 text-center sm:flex-row sm:text-left">
          <HeartIcon size={22} className="shrink-0 text-wine" />
          <p className="flex-1 text-sm text-ink-400"><span className="text-ink">Keep your wishlist forever.</span> Sign in or create an account to save these pieces across all your devices.</p>
          <Link href="/account/login?next=/wishlist" className="btn-primary btn-sm shrink-0">Sign in</Link>
        </div>
      )}
      <WishlistGrid products={products} />
    </div>
  );
}
