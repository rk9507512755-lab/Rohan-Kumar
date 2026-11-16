import type { Metadata } from "next";
import CartPageClient from "@/components/cart/CartPageClient";
import { getCartView } from "@/lib/cart";

export const metadata: Metadata = { title: "Your Bag", robots: { index: false } };

export default async function CartPage() {
  const cart = await getCartView();
  return <div className="container-site py-12 lg:py-16"><CartPageClient initial={cart} /></div>;
}
