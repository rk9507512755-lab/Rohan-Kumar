"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/account";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/account", label: "Overview", exact: true },
  { href: "/account/orders", label: "Orders" },
  { href: "/wishlist", label: "Wishlist" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/returns", label: "Returns & Exchanges" },
  { href: "/account/profile", label: "Profile" },
];

export default function AccountNav() {
  const path = usePathname();
  const active = (l: (typeof LINKS)[number]) => (l.exact ? path === l.href : path === l.href || path.startsWith(l.href + "/"));
  return (
    <nav aria-label="My account" className="no-print">
      {/* Mobile: horizontally scrolling tabs */}
      <div className="-mx-4 border-b border-ink-200/70 sm:-mx-6 lg:hidden">
        <ul className="no-scrollbar flex gap-6 overflow-x-auto px-4 sm:px-6">
          {LINKS.map((l) => (
            <li key={l.href} className="shrink-0">
              <Link href={l.href} aria-current={active(l) ? "page" : undefined}
                className={cn("block border-b-[1.5px] py-3.5 text-[11px] uppercase tracking-[0.16em] transition", active(l) ? "border-wine text-wine" : "border-transparent text-ink-400 hover:text-ink")}>
                {l.label}
              </Link>
            </li>
          ))}
          <li className="shrink-0">
            <form action={logoutAction}><button className="block border-b-[1.5px] border-transparent py-3.5 text-[11px] uppercase tracking-[0.16em] text-ink-400 hover:text-wine">Sign out</button></form>
          </li>
        </ul>
      </div>
      {/* Desktop: side nav */}
      <ul className="hidden border-t border-ink-200/70 lg:block">
        {LINKS.map((l) => (
          <li key={l.href} className="border-b border-ink-200/70">
            <Link href={l.href} aria-current={active(l) ? "page" : undefined}
              className={cn("group flex items-center justify-between py-3.5 text-[12px] uppercase tracking-[0.16em] transition", active(l) ? "text-wine" : "text-ink-400 hover:text-ink")}>
              <span className="flex items-center gap-3">
                <span className={cn("h-px transition-all duration-300", active(l) ? "w-5 bg-wine" : "w-0 bg-ink group-hover:w-3")} />
                {l.label}
              </span>
            </Link>
          </li>
        ))}
        <li className="border-b border-ink-200/70">
          <form action={logoutAction}><button className="w-full py-3.5 text-left text-[12px] uppercase tracking-[0.16em] text-ink-400 transition hover:text-wine">Sign out</button></form>
        </li>
      </ul>
    </nav>
  );
}
