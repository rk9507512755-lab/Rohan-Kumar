import type { Metadata } from "next";
import Link from "next/link";
import Img from "@/components/Img";
import PageTitle from "@/components/account/PageTitle";
import StatusPill from "@/components/account/StatusPill";
import { ReturnIcon } from "@/components/icons";
import { RETURN_STATUS_LABEL } from "@/components/account/order-helpers";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Returns & Exchanges" };

export default async function ReturnsPage() {
  const user = await requireUser("/account/returns");
  const returns = await db.returnRequest.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { order: { select: { number: true } }, orderItem: { select: { name: true, image: true, size: true, colour: true } } },
  });
  return (
    <div>
      <PageTitle title="Returns & Exchanges" text={<>Requests can be raised within 7 days of delivery from the order page. <Link href="/pages/returns-exchanges" className="text-wine underline decoration-gold/60 underline-offset-4">Read our policy</Link></>} />
      {returns.length ? (
        <ul className="divide-y divide-ink-200/70 border-y border-ink-200/70">
          {returns.map((r) => (
            <li key={r.id} className="flex gap-4 py-6 sm:gap-6">
              <div className="relative h-24 w-[72px] shrink-0 overflow-hidden bg-ivory-200 sm:h-28 sm:w-[88px]">
                {r.orderItem?.image && <Img src={r.orderItem.image} alt="" fill sizes="88px" className="object-cover object-top" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-gold-600">{r.type === "EXCHANGE" ? "Exchange" : "Return"} · {fmtDate(r.createdAt)}</p>
                    <p className="mt-1 font-display text-xl leading-snug">{r.orderItem?.name ?? "Order item"}</p>
                  </div>
                  <StatusPill status={r.status} label={RETURN_STATUS_LABEL[r.status]} className="self-start" />
                </div>
                <p className="mt-1.5 text-sm text-ink-400">
                  {r.reason}{r.type === "EXCHANGE" && r.exchangeSize && <> · New size: <span className="text-ink">{r.exchangeSize}</span></>}
                </p>
                {r.adminNote && <p className="mt-2 border-l-2 border-gold/60 pl-3 text-sm text-ink">{r.adminNote}</p>}
                <Link href={`/account/orders/${r.order.number}`} className="link-underline mt-3 inline-block text-[11px] uppercase tracking-[0.16em] text-wine">Order {r.order.number}</Link>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="card px-6 py-14 text-center">
          <ReturnIcon size={26} className="mx-auto text-gold" />
          <p className="mt-4 font-display text-2xl">No return or exchange requests</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-400">Need a different size? Open a delivered order and choose “Return or exchange” next to the item.</p>
          <Link href="/account/orders" className="btn-outline mt-6">View my orders</Link>
        </div>
      )}
    </div>
  );
}
