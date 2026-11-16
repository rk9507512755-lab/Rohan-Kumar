"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ChevronDown, CloseIcon, SearchIcon } from "@/components/icons";
import { cn, titleCase } from "@/lib/utils";

export type Facets = { fabrics: string[]; sizes: string[]; occasions: string[]; categories: { slug: string; name: string }[]; minPrice: number; maxPrice: number };

const SORTS = [["", "Featured"], ["newest", "Newest"], ["popular", "Most popular"], ["price-asc", "Price: low to high"], ["price-desc", "Price: high to low"]];
const PRICE_BANDS: [number, number | null, string][] = [[0, 2999, "Under ₹3,000"], [3000, 7999, "₹3,000 – ₹8,000"], [8000, 19999, "₹8,000 – ₹20,000"], [20000, 49999, "₹20,000 – ₹50,000"], [50000, null, "Above ₹50,000"]];

function useQuery() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const set = (mut: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams(sp.toString());
    mut(p);
    p.delete("show");
    start(() => router.push(`${pathname}${p.toString() ? `?${p}` : ""}`, { scroll: false }));
  };
  const list = (k: string) => (sp.get(k) ?? "").split(",").filter(Boolean);
  const toggle = (k: string, v: string) => set((p) => {
    const cur = new Set((p.get(k) ?? "").split(",").filter(Boolean));
    if (cur.has(v)) cur.delete(v); else cur.add(v);
    if (cur.size) p.set(k, [...cur].join(",")); else p.delete(k);
  });
  return { sp, set, list, toggle, pending };
}

function Group({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group border-b border-ink-200/70 py-4">
      <summary className="flex cursor-pointer items-center justify-between text-[11px] uppercase tracking-[0.18em] text-ink">{title}<ChevronDown size={15} className="transition group-open:rotate-180" /></summary>
      <div className="pt-4">{children}</div>
    </details>
  );
}

function Check({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 py-1.5 text-sm text-ink-400 hover:text-ink">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-[#C4553D]" />
      <span className={checked ? "text-ink" : ""}>{label}</span>
    </label>
  );
}

function FilterBody({ facets, showCategory }: { facets: Facets; showCategory: boolean }) {
  const { sp, set, list, toggle } = useQuery();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [min, setMin] = useState(sp.get("min") ?? "");
  const [max, setMax] = useState(sp.get("max") ?? "");
  useEffect(() => { setMin(sp.get("min") ?? ""); setMax(sp.get("max") ?? ""); setQ(sp.get("q") ?? ""); }, [sp]);
  const band = `${sp.get("min") ?? ""}-${sp.get("max") ?? ""}`;
  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); set((p) => (q.trim() ? p.set("q", q.trim()) : p.delete("q"))); }} className="flex items-center gap-2 border-b border-ink/50 pb-2">
        <SearchIcon size={16} className="text-ink-300" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search in this collection" aria-label="Search within collection" className="w-full bg-transparent text-sm outline-none placeholder:text-ink-300" />
      </form>
      {showCategory && facets.categories.length > 1 && (
        <Group title="Category">{facets.categories.map((c) => <Check key={c.slug} label={c.name} checked={list("cat").includes(c.slug)} onChange={() => toggle("cat", c.slug)} />)}</Group>
      )}
      <Group title="Price">
        <div className="space-y-0.5">
          {PRICE_BANDS.filter(([lo]) => lo <= facets.maxPrice).map(([lo, hi, label]) => {
            const key = `${lo || ""}-${hi ?? ""}`;
            return <Check key={label} label={label} checked={band === key} onChange={() => set((p) => { if (band === key) { p.delete("min"); p.delete("max"); } else { lo ? p.set("min", String(lo)) : p.delete("min"); hi ? p.set("max", String(hi)) : p.delete("max"); } })} />;
          })}
        </div>
        <form className="mt-3 flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); set((p) => { min ? p.set("min", min) : p.delete("min"); max ? p.set("max", max) : p.delete("max"); }); }}>
          <input inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} placeholder={`₹${facets.minPrice}`} aria-label="Minimum price" className="field w-full px-2 py-2 text-sm" />
          <span className="text-ink-300">–</span>
          <input inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} placeholder={`₹${facets.maxPrice}`} aria-label="Maximum price" className="field w-full px-2 py-2 text-sm" />
          <button className="btn-outline btn-sm px-3">Go</button>
        </form>
      </Group>
      {facets.sizes.length > 1 && (
        <Group title="Size">
          <div className="flex flex-wrap gap-2">
            {facets.sizes.map((s) => <button key={s} type="button" onClick={() => toggle("size", s)} aria-pressed={list("size").includes(s)} className={cn("chip min-w-[44px] justify-center", list("size").includes(s) && "chip-active")}>{s}</button>)}
          </div>
        </Group>
      )}
      {facets.fabrics.length > 1 && <Group title="Fabric">{facets.fabrics.map((f) => <Check key={f} label={f} checked={list("fabric").includes(f)} onChange={() => toggle("fabric", f)} />)}</Group>}
      {facets.occasions.length > 1 && <Group title="Occasion">{facets.occasions.map((o) => <Check key={o} label={titleCase(o)} checked={list("occasion").includes(o)} onChange={() => toggle("occasion", o)} />)}</Group>}
      <Group title="Availability">
        <Check label="In stock" checked={sp.get("avail") === "in"} onChange={() => set((p) => (p.get("avail") === "in" ? p.delete("avail") : p.set("avail", "in")))} />
        <Check label="Sold out" checked={sp.get("avail") === "out"} onChange={() => set((p) => (p.get("avail") === "out" ? p.delete("avail") : p.set("avail", "out")))} />
      </Group>
    </div>
  );
}

export function ActiveFilters({ facets }: { facets: Facets }) {
  const { sp, set, toggle } = useQuery();
  const chips: { label: string; clear: () => void }[] = [];
  const add = (k: string, fmt: (v: string) => string = (v) => v) => (sp.get(k) ?? "").split(",").filter(Boolean).forEach((v) => chips.push({ label: fmt(v), clear: () => toggle(k, v) }));
  add("cat", (v) => facets.categories.find((c) => c.slug === v)?.name ?? v);
  add("size", (v) => `Size ${v}`);
  add("fabric");
  add("occasion", titleCase);
  if (sp.get("min") || sp.get("max")) chips.push({ label: `₹${sp.get("min") || 0} – ${sp.get("max") ? `₹${sp.get("max")}` : "+"}`, clear: () => set((p) => { p.delete("min"); p.delete("max"); }) });
  if (sp.get("avail")) chips.push({ label: sp.get("avail") === "in" ? "In stock" : "Sold out", clear: () => set((p) => p.delete("avail")) });
  if (sp.get("q")) chips.push({ label: `“${sp.get("q")}”`, clear: () => set((p) => p.delete("q")) });
  if (!chips.length) return null;
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      {chips.map((c) => <button key={c.label} onClick={c.clear} className="chip">{c.label}<CloseIcon size={12} /></button>)}
      <button onClick={() => set((p) => { for (const k of ["cat", "size", "fabric", "occasion", "min", "max", "avail", "q"]) p.delete(k); })} className="ml-1 text-xs text-wine underline underline-offset-4">Clear all</button>
    </div>
  );
}

export function SortSelect() {
  const { sp, set } = useQuery();
  return (
    <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-ink-400">
      <span className="hidden sm:inline">Sort</span>
      <select value={sp.get("sort") ?? ""} onChange={(e) => set((p) => (e.target.value ? p.set("sort", e.target.value) : p.delete("sort")))}
        className="border-0 border-b border-ink/40 bg-transparent py-1.5 pr-6 text-[12px] normal-case tracking-normal text-ink focus:ring-0" aria-label="Sort products">
        {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

export default function Filters({ facets, showCategory = true }: { facets: Facets; showCategory?: boolean }) {
  const [open, setOpen] = useState(false);
  const { pending } = useQuery();
  return (
    <>
      <aside className={cn("hidden lg:block", pending && "opacity-60")} aria-label="Filters"><FilterBody facets={facets} showCategory={showCategory} /></aside>
      <button onClick={() => setOpen(true)} className="btn-outline btn-sm lg:hidden">Filter</button>
      {open && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm animate-fadeIn flex-col bg-ivory">
            <div className="flex items-center justify-between border-b border-ink-200/70 px-5 py-4"><span className="font-display text-2xl">Filter</span><button onClick={() => setOpen(false)} aria-label="Close filters"><CloseIcon /></button></div>
            <div className="flex-1 overflow-y-auto px-5 py-4"><FilterBody facets={facets} showCategory={showCategory} /></div>
            <div className="border-t border-ink-200/70 p-4"><button onClick={() => setOpen(false)} className="btn-primary w-full">Show results</button></div>
          </div>
        </div>
      )}
    </>
  );
}
