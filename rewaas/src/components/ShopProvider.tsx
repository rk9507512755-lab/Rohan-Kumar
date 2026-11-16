"use client";

import { createContext, useCallback, useContext, useEffect, useState, useTransition, type ReactNode } from "react";
import type { CartView } from "@/lib/cart";
import { addToCart as addAction, addHamperToCart, fetchCart, toggleWishlist } from "@/app/actions/shop";

type Toast = { id: number; text: string; tone: "ok" | "error" };
type Ctx = {
  cart: CartView | null;
  setCart: (c: CartView) => void;
  count: number;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  addToCart: (variantId: string, qty?: number, opts?: { silent?: boolean }) => Promise<boolean>;
  addHamper: (config: unknown, qty?: number) => Promise<boolean>;
  wishlist: Set<string>;
  toggleWish: (productId: string) => Promise<void>;
  toast: (text: string, tone?: "ok" | "error") => void;
  pending: boolean;
};
const ShopContext = createContext<Ctx | null>(null);

export function useShop() {
  const c = useContext(ShopContext);
  if (!c) throw new Error("useShop must be used inside ShopProvider");
  return c;
}

export default function ShopProvider({ children, initialCount, initialWishlist }: { children: ReactNode; initialCount: number; initialWishlist: string[] }) {
  const [cart, setCartState] = useState<CartView | null>(null);
  const [count, setCount] = useState(initialCount);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [wishlist, setWishlist] = useState(() => new Set(initialWishlist));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, startTransition] = useTransition();

  const setCart = useCallback((c: CartView) => { setCartState(c); setCount(c.count); }, []);
  const toast = useCallback((text: string, tone: "ok" | "error" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
    startTransition(async () => setCart(await fetchCart()));
  }, [setCart]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
  }, [drawerOpen]);

  const addToCart = useCallback(async (variantId: string, qty = 1, opts?: { silent?: boolean }) => {
    const r = await addAction(variantId, qty);
    if (!r.ok) { toast(r.error, "error"); return false; }
    setCart(r.cart);
    if (!opts?.silent) setDrawerOpen(true);
    return true;
  }, [setCart, toast]);

  const addHamper = useCallback(async (config: unknown, qty = 1) => {
    const r = await addHamperToCart(config, qty);
    if (!r.ok) { toast(r.error, "error"); return false; }
    setCart(r.cart);
    setDrawerOpen(true);
    return true;
  }, [setCart, toast]);

  const toggleWish = useCallback(async (productId: string) => {
    setWishlist((s) => { const n = new Set(s); if (n.has(productId)) n.delete(productId); else n.add(productId); return n; });
    const r = await toggleWishlist(productId);
    if (!r.ok) { toast(r.error ?? "Could not update wishlist", "error"); return; }
    setWishlist((s) => { const n = new Set(s); if (r.wished) n.add(productId); else n.delete(productId); return n; });
    toast(r.wished ? "Saved to your wishlist" : "Removed from wishlist");
  }, [toast]);

  return (
    <ShopContext.Provider value={{ cart, setCart, count, drawerOpen, openDrawer, closeDrawer: () => setDrawerOpen(false), addToCart, addHamper, wishlist, toggleWish, toast, pending }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-[80] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div key={t.id} className={`pointer-events-auto animate-fadeUp px-5 py-3 text-sm shadow-lg ${t.tone === "error" ? "bg-wine-800 text-ivory" : "bg-ink text-ivory"}`}>{t.text}</div>
        ))}
      </div>
    </ShopContext.Provider>
  );
}
