import type { Metadata } from "next";
import Link from "next/link";
import Img from "@/components/Img";
import StatusPill from "@/components/account/StatusPill";
import { ArrowRight, HeartIcon, PinIcon, ReturnIcon, UserIcon } from "@/components/icons";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { inr } from "@/lib/money";
import { STATUS_LABEL } from "@/lib/orders";
import { fmtDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Overview" };

export default async function AccountOverview() {
  const user = await requireUser();
  const [orders, orderCount, address, wishCount, openReturns] = await Promise.all([
    db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 3, include: { items: { select: { id: true, image: true, name: true }, take: 4 } } }),
    db.order.count({ where: { userId: user.id } }),
    db.address.findFirst({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }),
    db.wishlistItem.count({ where: { userId: user.id } }),
    db.returnRequest.count({ where: { userId: user.id, status: { in: ["REQUESTED", "APPROVED", "PICKED_UP"] } } }),
  ]);
  const stats = [
    { label: "Orders", value: orderCount, href: "/account/orders" },
    { label: "Wishlist", value: wishCount, href: "/wishlist" },
    { label: "Open returns", value: openReturns, href: "/account/returns" },
  ];
  return (
    <div className="space-y-12">
      <p className="lead max-w-2xl">From here you can follow your orders, manage delivery addresses and update your details. Member since {fmtDate(user.createdAt, { month: "long", year: "numeric" })}.</p>

      <div className="grid grid-cols-3 border-y border-ink-200/70">
        {stats.map((s, i) => (
          <Link key={s.label} href={s.href} className={`group px-2 py-6 text-center transition hover:bg-white sm:py-8 ${i ? "border-l border-ink-200/70" : ""}`}>
            <p className="font-display text-4xl text-wine sm:text-5xl">{s.value}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-ink-400 group-hover:text-ink sm:text-[11px]">{s.label}</p>
          </Link>
        ))}
      </div>

      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <h1 className="font-display text-3xl">Recent orders</h1>
          {orderCount > 0 && <Link href="/account/orders" className="link-underline shrink-0 text-[11px] uppercase tracking-[0.2em] text-wine">View all →</Link>}
        </div>
        {orders.length ? (
          <ul className="divide-y divide-ink-200/70 border-y border-ink-200/70">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/account/orders/${o.number}`} className="group flex items-center gap-4 py-5 transition sm:gap-6">
                  <div className="flex -space-x-5">
                    {o.items.slice(0, 3).map((it) => (
                      <div key={it.id} className="relative h-[72px] w-14 overflow-hidden border-2 border-ivory bg-ivory-200">{it.image && <Img src={it.image} alt="" fill sizes="56px" className="object-cover object-top" />}</div>
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink">Order {o.number}</p>
                    <p className="mt-0.5 text-xs text-ink-400">{fmtDate(o.createdAt)} · {inr(o.total)}</p>
                    <StatusPill className="mt-2 sm:hidden" status={o.status} label={STATUS_LABEL[o.status]} />
                  </div>
                  <StatusPill className="hidden sm:inline-flex" status={o.status} label={STATUS_LABEL[o.status]} />
                  <ArrowRight size={16} className="shrink-0 text-ink-300 transition group-hover:translate-x-1 group-hover:text-wine" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="card px-6 py-12 text-center">
            <p className="font-display text-2xl">No orders yet</p>
            <p className="mt-2 text-sm text-ink-400">When you place an order, you'll be able to follow it here.</p>
            <Link href="/collections/new-arrivals" className="btn-primary mt-6">Explore new arrivals</Link>
          </div>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card p-6 sm:p-8">
          <div className="flex items-center justify-between"><p className="eyebrow">Default address</p><PinIcon size={18} className="text-gold" /></div>
          {address ? (
            <address className="mt-4 text-sm not-italic leading-relaxed text-ink-400">
              <span className="font-display text-xl text-ink">{address.name}</span><br />
              {address.line1}{address.line2 && <>, {address.line2}</>}<br />
              {address.landmark && <>{address.landmark}<br /></>}
              {address.city}, {address.state} {address.pincode}<br />+91 {address.phone}
            </address>
          ) : <p className="mt-4 text-sm text-ink-400">You haven't saved an address yet.</p>}
          <Link href={address ? "/account/addresses" : "/account/addresses/new"} className="link-underline mt-6 inline-block text-[11px] uppercase tracking-[0.2em] text-wine">{address ? "Manage addresses" : "Add an address"}</Link>
        </section>
        <section className="card p-6 sm:p-8">
          <p className="eyebrow">Quick links</p>
          <ul className="mt-4 divide-y divide-ink-200/60">
            {[
              { href: "/account/profile", label: "Personal details & password", Icon: UserIcon },
              { href: "/wishlist", label: "Your wishlist", Icon: HeartIcon },
              { href: "/account/returns", label: "Returns & exchanges", Icon: ReturnIcon },
              { href: "/pages/contact", label: "Contact client care", Icon: PinIcon },
            ].map(({ href, label, Icon }) => (
              <li key={href}>
                <Link href={href} className="group flex items-center gap-3 py-3 text-sm text-ink transition hover:text-wine">
                  <Icon size={17} className="text-ink-300 group-hover:text-wine" /><span className="flex-1">{label}</span><ArrowRight size={14} className="text-ink-200 transition group-hover:translate-x-1 group-hover:text-wine" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
