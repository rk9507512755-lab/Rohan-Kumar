import type { Metadata } from "next";
import Link from "next/link";
import Img from "@/components/Img";
import PageTitle from "@/components/account/PageTitle";
import StatusPill from "@/components/account/StatusPill";
import { BagIcon } from "@/components/icons";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { inr } from "@/lib/money";
import { STATUS_LABEL } from "@/lib/orders";
import { fmtDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage() {
  const user = await requireUser("/account/orders");
  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { items: { select: { id: true, image: true, name: true, quantity: true } } },
  });
  return (
    <div>
      <PageTitle title="Orders" text={orders.length ? `${orders.length} order${orders.length > 1 ? "s" : ""} placed with REWAAS` : undefined} />
      {orders.length ? (
        <ul className="space-y-5">
          {orders.map((o) => {
            const qty = o.items.reduce((a, it) => a + it.quantity, 0);
            return (
              <li key={o.id} className="card transition hover:border-ink-200">
                <Link href={`/account/orders/${o.number}`} className="block">
                  <div className="grid grid-cols-2 gap-4 border-b border-ink-200/60 px-5 py-4 text-xs sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center sm:px-6">
                    <div><p className="field-label mb-0.5">Order</p><p className="text-sm text-ink">{o.number}</p></div>
                    <div><p className="field-label mb-0.5">Placed</p><p className="text-sm text-ink">{fmtDate(o.createdAt)}</p></div>
                    <div><p className="field-label mb-0.5">Total</p><p className="text-sm text-ink">{inr(o.total)}</p></div>
                    <div className="sm:text-right"><StatusPill status={o.status} label={STATUS_LABEL[o.status]} /></div>
                  </div>
                  <div className="flex items-center gap-4 px-5 py-4 sm:px-6">
                    <div className="flex gap-2 overflow-hidden">
                      {o.items.slice(0, 4).map((it) => (
                        <div key={it.id} className="relative h-20 w-16 shrink-0 overflow-hidden bg-ivory-200" title={it.name}>
                          {it.image && <Img src={it.image} alt={it.name} fill sizes="64px" className="object-cover object-top" />}
                        </div>
                      ))}
                      {o.items.length > 4 && <div className="flex h-20 w-16 shrink-0 items-center justify-center bg-ivory-200 text-xs text-ink-400">+{o.items.length - 4}</div>}
                    </div>
                    <div className="hidden min-w-0 flex-1 sm:block">
                      <p className="truncate font-display text-lg">{o.items[0]?.name}{o.items.length > 1 && <span className="text-ink-400"> & {o.items.length - 1} more</span>}</p>
                      <p className="text-xs text-ink-400">{qty} item{qty > 1 ? "s" : ""}</p>
                    </div>
                    <span className="ml-auto shrink-0 text-[11px] uppercase tracking-[0.16em] text-wine">View details →</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="card px-6 py-14 text-center">
          <BagIcon size={26} className="mx-auto text-gold" />
          <p className="mt-4 font-display text-2xl">You haven't placed an order yet</p>
          <p className="mt-2 text-sm text-ink-400">Our newest sarees, suits and hampers are waiting.</p>
          <Link href="/collections/new-arrivals" className="btn-primary mt-6">Shop new arrivals</Link>
        </div>
      )}
    </div>
  );
}
