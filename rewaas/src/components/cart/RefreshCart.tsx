"use client";

import { useEffect } from "react";
import { useShop } from "@/components/ShopProvider";
import { fetchCart } from "@/app/actions/shop";

/** Re-syncs the header bag count after checkout empties the bag. */
export default function RefreshCart() {
  const { setCart } = useShop();
  useEffect(() => { fetchCart().then(setCart).catch(() => {}); }, [setCart]);
  return null;
}
