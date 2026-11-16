"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Img from "@/components/Img";
import { useShop } from "@/components/ShopProvider";
import { BagIcon, ChevronDown, CloseIcon, HeartIcon, MenuIcon, SearchIcon, UserIcon } from "@/components/icons";
import { inr } from "@/lib/money";
import { cn } from "@/lib/utils";

export type NavItem = { label: string; href: string; image: string | null; children: { label: string; href: string }[] };

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" aria-label="REWAAS home" className={cn("group flex flex-col items-center leading-none", className)}>
      <span className="font-display text-[26px] font-medium tracking-[0.32em] text-wine sm:text-[32px]">REWAAS</span>
      <span className="mt-1 hidden text-[8.5px] uppercase tracking-[0.42em] text-gold-600 sm:block">The Beauty of Being You</span>
    </Link>
  );
}

function Announcements({ items }: { items: { text: string; href: string | null }[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % items.length), 4500);
    return () => clearInterval(t);
  }, [items.length]);
  if (!items.length) return null;
  const a = items[i];
  return (
    <div className="bg-wine-700 text-ivory">
      <div className="container-site flex h-9 items-center justify-center text-center text-[11px] uppercase tracking-[0.2em]">
        <p key={i} className="animate-fadeIn truncate">
          {a.href ? <Link href={a.href} className="hover:text-gold-300">{a.text}</Link> : a.text}
        </p>
      </div>
    </div>
  );
}

function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ slug: string; name: string; price: number; image: string | null; category: string }[]>([]);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);
  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal }).then((r) => r.json()).then((d) => setResults(d.products)).catch(() => {});
    }, 220);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);
  if (!open) return null;
  const popular = ["Banarasi saree", "Anarkali", "Bridal lehenga", "Chikankari", "Gift hamper", "Organza"];
  return (
    <div className="fixed inset-0 z-[70] animate-fadeIn bg-ink/40" onClick={onClose}>
      <div className="bg-ivory shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="container-site py-6 sm:py-10">
          <form onSubmit={(e) => { e.preventDefault(); if (q.trim()) { router.push(`/search?q=${encodeURIComponent(q.trim())}`); onClose(); } }} className="flex items-center gap-3 border-b border-ink/70 pb-3">
            <SearchIcon size={22} className="text-ink-400" />
            <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sarees, lehengas, hampers…" aria-label="Search"
              className="flex-1 bg-transparent font-display text-2xl outline-none placeholder:text-ink-300 sm:text-3xl" />
            <button type="button" onClick={onClose} aria-label="Close search" className="p-1"><CloseIcon /></button>
          </form>
          {results.length > 0 ? (
            <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {results.map((r) => (
                <li key={r.slug}>
                  <Link href={`/products/${r.slug}`} onClick={onClose} className="group block">
                    <div className="relative aspect-[4/5] overflow-hidden bg-ivory-200">
                      {r.image && <Img src={r.image} alt={r.name} fill sizes="200px" className="img-zoom object-cover" />}
                    </div>
                    <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-ink-300">{r.category}</p>
                    <p className="text-sm leading-snug">{r.name}</p>
                    <p className="text-sm text-ink-400">{inr(r.price)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-6">
              <p className="eyebrow mb-3">Popular searches</p>
              <div className="flex flex-wrap gap-2">
                {popular.map((p) => <Link key={p} href={`/search?q=${encodeURIComponent(p)}`} onClick={onClose} className="chip">{p}</Link>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MobileMenu({ open, onClose, nav, userName }: { open: boolean; onClose: () => void; nav: NavItem[]; userName: string | null }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] bg-ink/40 lg:hidden" onClick={onClose}>
      <nav aria-label="Mobile" className="h-full w-[86%] max-w-sm animate-fadeIn overflow-y-auto bg-ivory" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-ink-200/70 px-5 py-4">
          <span className="font-display text-xl tracking-[0.3em] text-wine">REWAAS</span>
          <button onClick={onClose} aria-label="Close menu"><CloseIcon /></button>
        </div>
        <ul className="px-5 py-2">
          <li><Link href="/" onClick={onClose} className="block border-b border-ink-200/60 py-4 text-[13px] uppercase tracking-[0.16em]">Home</Link></li>
          {nav.map((n) => (
            <li key={n.label} className="border-b border-ink-200/60">
              {n.children.length ? (
                <>
                  <button onClick={() => setExpanded(expanded === n.label ? null : n.label)} className="flex w-full items-center justify-between py-4 text-[13px] uppercase tracking-[0.16em]" aria-expanded={expanded === n.label}>
                    {n.label}<ChevronDown size={16} className={cn("transition", expanded === n.label && "rotate-180")} />
                  </button>
                  {expanded === n.label && (
                    <ul className="pb-4 pl-3">
                      <li><Link href={n.href} onClick={onClose} className="block py-2 text-sm text-wine">Shop all {n.label}</Link></li>
                      {n.children.map((c) => <li key={c.href + c.label}><Link href={c.href} onClick={onClose} className="block py-2 text-sm text-ink-400">{c.label}</Link></li>)}
                    </ul>
                  )}
                </>
              ) : (
                <Link href={n.href} onClick={onClose} className="block py-4 text-[13px] uppercase tracking-[0.16em]">{n.label}</Link>
              )}
            </li>
          ))}
        </ul>
        <div className="space-y-3 px-5 py-6 text-sm text-ink-400">
          <Link href="/account" onClick={onClose} className="flex items-center gap-3"><UserIcon size={18} />{userName ? `Hi, ${userName.split(" ")[0]}` : "Sign in / Register"}</Link>
          <Link href="/wishlist" onClick={onClose} className="flex items-center gap-3"><HeartIcon size={18} />Wishlist</Link>
          <Link href="/track-order" onClick={onClose} className="flex items-center gap-3"><BagIcon size={18} />Track your order</Link>
        </div>
      </nav>
    </div>
  );
}

export default function HeaderClient({ nav, announcements, userName }: { nav: NavItem[]; announcements: { text: string; href: string | null }[]; userName: string | null }) {
  const { count, openDrawer, wishlist } = useShop();
  const [mega, setMega] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setMega(null); setMenuOpen(false); setSearchOpen(false); }, [pathname]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setSearchOpen(false); setMega(null); setMenuOpen(false); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openMega = (label: string | null) => { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setMega(label), label ? 90 : 160); };
  const active = nav.find((n) => n.label === mega && n.children.length);

  return (
    <>
      <Announcements items={announcements} />
      <header className={cn("sticky top-0 z-50 border-b bg-ivory/95 backdrop-blur transition-shadow", scrolled ? "border-ink-200/70 shadow-[0_6px_24px_-18px_rgba(34,27,25,.45)]" : "border-transparent")} onMouseLeave={() => openMega(null)}>
        <div className="container-site">
          <div className={cn("grid grid-cols-[1fr_auto_1fr] items-center transition-all", scrolled ? "h-16" : "h-[72px] lg:h-[84px]")}>
            <div className="flex items-center gap-1">
              <button className="-ml-2 p-2 lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu"><MenuIcon size={22} /></button>
              <button className="p-2 lg:-ml-2" onClick={() => setSearchOpen(true)} aria-label="Search"><SearchIcon size={21} /></button>
              <span className="hidden text-[11px] uppercase tracking-[0.18em] text-ink-400 lg:inline">Search</span>
            </div>
            <Logo />
            <div className="flex items-center justify-end gap-0.5 sm:gap-1.5">
              <Link href="/account" className="hidden p-2 sm:block" aria-label={userName ? "My account" : "Sign in"} title={userName ? `Hi, ${userName}` : "Sign in"}><UserIcon size={21} /></Link>
              <Link href="/wishlist" className="relative p-2" aria-label="Wishlist">
                <HeartIcon size={21} />
                {wishlist.size > 0 && <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] text-white">{wishlist.size}</span>}
              </Link>
              <button onClick={openDrawer} className="relative -mr-2 p-2" aria-label={`Shopping bag, ${count} items`}>
                <BagIcon size={21} />
                {count > 0 && <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-wine px-1 text-[9px] text-ivory">{count}</span>}
              </button>
            </div>
          </div>
          <nav aria-label="Primary" className={cn("hidden justify-center lg:flex", scrolled ? "-mt-1 pb-2" : "pb-3")}>
            <ul className="flex items-center gap-7 xl:gap-9">
              <li><Link href="/" className={cn("py-2 text-[11.5px] uppercase tracking-[0.18em] transition hover:text-wine", pathname === "/" && "text-wine")}>Home</Link></li>
              {nav.map((n) => (
                <li key={n.label} onMouseEnter={() => openMega(n.children.length ? n.label : null)}>
                  <Link href={n.href} className={cn("link-underline py-2 text-[11.5px] uppercase tracking-[0.18em] transition hover:text-wine", (mega === n.label || pathname.startsWith(n.href)) && "text-wine")}>{n.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        {active && (
          <div className="absolute inset-x-0 top-full hidden animate-fadeIn border-t border-ink-200/60 bg-ivory shadow-[0_24px_40px_-28px_rgba(34,27,25,.5)] lg:block" onMouseEnter={() => openMega(active.label)}>
            <div className="container-site grid grid-cols-12 gap-10 py-10">
              <div className="col-span-3">
                <p className="eyebrow mb-4">{active.label}</p>
                <ul className="space-y-2.5">
                  {active.children.map((c) => <li key={c.href + c.label}><Link href={c.href} className="link-underline font-display text-[19px] text-ink hover:text-wine">{c.label}</Link></li>)}
                </ul>
                <Link href={active.href} className="mt-6 inline-block text-[11px] uppercase tracking-[0.18em] text-wine underline decoration-gold underline-offset-[6px]">Shop all {active.label}</Link>
              </div>
              <div className="col-span-9 grid grid-cols-3 gap-5">
                {[active.image, ...active.children.slice(0, 2).map(() => null)].map((_, idx) => {
                  const tile = idx === 0 ? { href: active.href, label: `Explore ${active.label}`, image: active.image } : { href: active.children[idx - 1].href, label: active.children[idx - 1].label, image: null };
                  return (
                    <Link key={idx} href={tile.href} className="group relative block aspect-[4/3] overflow-hidden bg-ivory-200">
                      <Img src={tile.image ?? megaFallback(active.label, idx)} alt={tile.label} fill sizes="320px" className="img-zoom object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent" />
                      <span className="absolute bottom-4 left-4 font-display text-xl text-ivory">{tile.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </header>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} nav={nav} userName={userName} />
    </>
  );
}

const MEGA_IMAGES: Record<string, string[]> = {
  Sarees: ["/photos/p-meenakshi-kanjeevaram-silk-saree.jpg", "/photos/p-sitara-hand-embroidered-organza-saree.jpg"],
  "Suits & Sets": ["/photos/p-zohra-embroidered-anarkali-set.jpg", "/photos/p-ruhani-silk-straight-suit-set.jpg"],
  Lehengas: ["/photos/p-rajkumari-bridal-lehenga.jpg", "/photos/p-gulabo-festive-lehenga.jpg"],
  Kurtis: ["/photos/p-ada-chikankari-kurti.jpg", "/photos/p-sanganeri-block-print-kurti.jpg"],
  "Bridal Collection": ["/photos/p-shehzaadi-bridal-velvet-lehenga.jpg", "/photos/p-meenakshi-kanjeevaram-silk-saree.jpg"],
  "Gift Hampers": ["/photos/p-bride-to-be-luxe-hamper.jpg", "/photos/p-diwali-diya-and-mithai-hamper.jpg"],
};
function megaFallback(label: string, idx: number) {
  return MEGA_IMAGES[label]?.[idx - 1] ?? "/photos/hero-1.jpg";
}
