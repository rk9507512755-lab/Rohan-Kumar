"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { CloseIcon, MenuIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { adminLogout } from "../actions";

type NavItem = { href: string; label: string; exact?: boolean };
const NAV: { group?: string; items: NavItem[] }[] = [
  { items: [{ href: "/admin", label: "Dashboard", exact: true }] },
  {
    group: "Sales",
    items: [
      { href: "/admin/orders", label: "Orders" },
      { href: "/admin/returns", label: "Returns & exchanges" },
      { href: "/admin/customers", label: "Customers" },
      { href: "/admin/coupons", label: "Coupons" },
    ],
  },
  {
    group: "Catalogue",
    items: [
      { href: "/admin/products", label: "Products" },
      { href: "/admin/categories", label: "Categories" },
      { href: "/admin/gift-studio", label: "Gift Studio" },
    ],
  },
  {
    group: "Website",
    items: [
      { href: "/admin/content/banners", label: "Banners" },
      { href: "/admin/content/announcements", label: "Announcements" },
      { href: "/admin/content/testimonials", label: "Testimonials" },
      { href: "/admin/content/pages", label: "Pages" },
      { href: "/admin/content/navigation", label: "Navigation menu" },
      { href: "/admin/content/newsletter", label: "Newsletter" },
    ],
  },
  { group: "Store", items: [{ href: "/admin/settings", label: "Settings" }] },
];

export default function AdminShell({
  children,
  userName,
  userEmail,
  badges,
}: {
  children: ReactNode;
  userName: string;
  userEmail: string;
  badges: Record<string, number>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (i: NavItem) => (i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(i.href + "/"));

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-6 pb-5 pt-6">
        <Link href="/admin" className="block">
          <span className="font-display text-[1.7rem] leading-none tracking-[0.22em] text-wine">REWAAS</span>
          <span className="mt-1 block text-[10px] uppercase tracking-luxe text-ink-400">Back office</span>
        </Link>
        <button type="button" className="p-1 text-ink-400 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
          <CloseIcon size={20} />
        </button>
      </div>
      <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 pb-6">
        {NAV.map((g, gi) => (
          <div key={gi} className="mb-4">
            {g.group && <p className="mb-1 px-3 text-[10px] uppercase tracking-[0.18em] text-ink-300">{g.group}</p>}
            <ul>
              {g.items.map((i) => {
                const active = isActive(i);
                const badge = badges[i.href];
                return (
                  <li key={i.href}>
                    <Link
                      href={i.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center justify-between border-l-2 px-3 py-2 text-[14px] transition",
                        active ? "border-wine bg-wine-50 font-medium text-wine" : "border-transparent text-ink/80 hover:bg-ivory-200/70 hover:text-ink",
                      )}
                    >
                      {i.label}
                      {badge ? <span className="rounded-full bg-wine px-1.5 py-px text-[10px] font-medium text-ivory">{badge}</span> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-ink-200/70 px-6 py-4">
        <p className="truncate text-sm font-medium">{userName}</p>
        <p className="truncate text-xs text-ink-400">{userEmail}</p>
        <div className="mt-3 flex items-center gap-4">
          <Link href="/" target="_blank" className="admin-link">
            View store ↗
          </Link>
          <form action={adminLogout}>
            <button type="submit" className="text-sm text-ink-400 hover:text-wine">
              Log out
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-ink-200/70 bg-white lg:block">{sidebar}</aside>
      {open && (
        <div className="no-print fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <button type="button" className="absolute inset-0 bg-ink/40" aria-label="Close menu" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-fadeIn bg-white shadow-xl">{sidebar}</aside>
        </div>
      )}
      <div className="no-print sticky top-0 z-20 flex items-center justify-between border-b border-ink-200/70 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-2 text-sm" aria-label="Open menu" aria-expanded={open}>
          <MenuIcon size={22} />
        </button>
        <Link href="/admin" className="font-display text-xl tracking-[0.2em] text-wine">
          REWAAS
        </Link>
        <span className="w-6" />
      </div>
      <main className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
