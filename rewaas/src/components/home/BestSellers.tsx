"use client";

import { useState } from "react";
import Link from "next/link";
import ProductCard, { type CardData } from "@/components/ProductCard";
import { cn } from "@/lib/utils";

export default function BestSellers({ tabs }: { tabs: { key: string; label: string; href: string; products: CardData[] }[] }) {
  const [active, setActive] = useState(tabs[0]?.key);
  const tab = tabs.find((t) => t.key === active) ?? tabs[0];
  return (
    <div>
      <div role="tablist" className="no-scrollbar -mx-4 mb-10 flex justify-start gap-2 overflow-x-auto px-4 sm:justify-center">
        {tabs.map((t) => (
          <button key={t.key} role="tab" aria-selected={t.key === active} onClick={() => setActive(t.key)} className={cn("chip whitespace-nowrap px-4 py-2 text-[11px] uppercase tracking-[0.14em]", t.key === active && "chip-active")}>{t.label}</button>
        ))}
      </div>
      <div key={tab.key} className="grid animate-fadeIn grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 lg:gap-x-6">
        {tab.products.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
      <div className="mt-12 text-center"><Link href={tab.href} className="btn-outline">View all {tab.label === "All" ? "best sellers" : tab.label}</Link></div>
    </div>
  );
}
