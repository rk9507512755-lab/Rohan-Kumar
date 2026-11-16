import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Img from "@/components/Img";
import OrderTimeline from "@/components/account/OrderTimeline";
import StatusPill from "@/components/account/StatusPill";
import { CancelOrder, ReturnRequest } from "@/components/account/OrderActions";
import { CheckIcon, GiftIcon } from "@/components/icons";
import { buildTimeline, CANCELLABLE, PAYMENT_LABEL, PAYMENT_STATUS_LABEL, parseAddress, parseHamper, RETURN_STATUS_LABEL, returnWindow } from "@/components/account/order-helpers";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { inr } from "@/lib/money";
import { STATUS_LABEL } from "@/lib/orders";
import { fmtDate } from "@/lib/utils";

type Props = { params: Promise<{ number: string }>; searchParams: Promise<{ placed?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Order ${(await params).number}`, robots: { index: false } };
}

export default async function OrderDetailPage({ params, searchParams }: Props) {
  const { number } = await params;
  const { placed } = await searchParams;
  const user = await requireUser(`/account/orders/${number}`);
  const order = await db.order.findFirst({
    where: { number, userId: user.id },
    include: {
      items: { include: { returns: { select: { id: true, type: true, status: true } }, product: { select: { slug: true, variants: { select: { size: true }, orderBy: { id: "asc" } } } } } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) notFound();

  const address = parseAddress(order.shippingAddress);
  const steps = buildTimeline(order);
  const win = returnWindow(order);
  const canCancel = CANCELLABLE.includes(order.status);
  const inTransit = ["SHIPPED", "OUT_FOR_DELIVERY"].includes(order.status);
  const totals: [string, number, boolean?][] = [
    ["Subtotal", order.subtotal],
    ...(order.discount ? [[`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`, -order.discount] as [string, number]] : []),
    ["Shipping", order.shippingFee, true],
    ...(order.codFee ? [["COD handling", order.codFee] as [string, number]] : []),
    ...(order.giftWrapFee ? [["Gift wrap", order.giftWrapFee] as [string, number]] : []),
  ];

  return (
    <div className="space-y-10">
      {placed === "1" && (
        <div className="animate-fadeUp flex items-start gap-4 border border-gold/40 bg-ivory-200 p-5 sm:items-center sm:p-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-wine text-ivory"><CheckIcon size={18} /></span>
          <div>
            <p className="font-display text-2xl leading-tight">Thank you — your order is confirmed</p>
            <p className="mt-1 text-sm text-ink-400">We've sent the details to {order.email}. We'll let you know the moment it ships.</p>
          </div>
        </div>
      )}

      <header className="flex flex-col gap-5 border-b border-ink-200/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/account/orders" className="text-[11px] uppercase tracking-[0.16em] text-ink-400 hover:text-wine">← All orders</Link>
          <h1 className="mt-3 font-display text-[2rem] leading-tight sm:text-[2.4rem]">Order {order.number}</h1>
          <p className="mt-1 text-sm text-ink-400">Placed on {fmtDate(order.createdAt, { day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill status={order.status} label={STATUS_LABEL[order.status]} />
          {order.status !== "PENDING_PAYMENT" && <Link href={`/account/orders/${order.number}/invoice`} target="_blank" className="btn-outline btn-sm">Invoice</Link>}
        </div>
      </header>

      <section className="card p-5 sm:p-8">
        <p className="eyebrow mb-6">Tracking</p>
        <OrderTimeline steps={steps} />
        {(order.courier || order.trackingNumber || (order.estimatedDelivery && !["DELIVERED", "CANCELLED", "RETURNED", "RETURN_REQUESTED"].includes(order.status))) && (
          <dl className="mt-8 grid gap-4 border-t border-ink-200/60 pt-6 text-sm sm:grid-cols-3">
            {order.estimatedDelivery && !["DELIVERED", "CANCELLED", "RETURNED", "RETURN_REQUESTED"].includes(order.status) && <div><dt className="field-label">Estimated delivery</dt><dd className="text-ink">{fmtDate(order.estimatedDelivery, { weekday: "short", day: "numeric", month: "long" })}</dd></div>}
            {order.courier && <div><dt className="field-label">Courier</dt><dd>{order.courier}</dd></div>}
            {order.trackingNumber && <div><dt className="field-label">Tracking number</dt><dd className="font-mono text-[13px]">{order.trackingNumber}</dd></div>}
          </dl>
        )}
        {order.status === "CANCELLED" && order.cancelReason && <p className="mt-6 border-t border-ink-200/60 pt-5 text-sm text-ink-400">Reason for cancellation: <span className="text-ink">{order.cancelReason}</span></p>}
        {inTransit && <p className="mt-6 text-xs text-ink-300">Your parcel is on its way and can no longer be cancelled. You can return or exchange it within 7 days of delivery.</p>}
      </section>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section>
          <h2 className="mb-4 font-display text-2xl">Items</h2>
          <ul className="divide-y divide-ink-200/70 border-y border-ink-200/70">
            {order.items.map((it) => {
              const hamper = it.kind === "HAMPER" ? parseHamper(it.hamperConfig) : null;
              const activeReturn = it.returns.find((r) => r.status !== "REJECTED");
              const sizes = [...new Set(it.product?.variants.map((v) => v.size) ?? [])];
              const eligible = win.open && it.kind === "PRODUCT" && !activeReturn;
              return (
                <li key={it.id} className="flex gap-4 py-6 sm:gap-5">
                  <div className="relative h-28 w-[84px] shrink-0 overflow-hidden bg-ivory-200 sm:h-32 sm:w-24">
                    {it.image ? <Img src={it.image} alt={it.name} fill sizes="96px" className="object-cover object-top" /> : hamper && <GiftIcon size={28} className="absolute inset-0 m-auto text-gold" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <div className="min-w-0">
                        {hamper && <p className="text-[10px] uppercase tracking-[0.18em] text-gold-600">Custom hamper</p>}
                        <p className="font-display text-xl leading-snug">
                          {it.product?.slug ? <Link href={`/products/${it.product.slug}`} className="hover:text-wine">{it.name}</Link> : it.name}
                        </p>
                        <p className="mt-1 text-xs text-ink-400">{[it.size && it.size !== "Free Size" ? `Size ${it.size}` : it.size, it.colour, `Qty ${it.quantity}`].filter(Boolean).join(" · ")}</p>
                      </div>
                      <p className="text-sm text-ink sm:text-right">{inr(it.total)}{it.quantity > 1 && <span className="block text-xs text-ink-300">{inr(it.unitPrice)} each</span>}</p>
                    </div>
                    {hamper && (
                      <div className="mt-3 space-y-1 border-l-2 border-gold/50 pl-3 text-sm text-ink-400">
                        {hamper.box && <p><span className="text-ink">Box:</span> {hamper.box}</p>}
                        {hamper.components.length > 0 && <p><span className="text-ink">Inside:</span> {hamper.components.map((c) => `${c.name}${c.qty > 1 ? ` × ${c.qty}` : ""}`).join(", ")}</p>}
                        {hamper.packaging && <p><span className="text-ink">Packaging:</span> {hamper.packaging}</p>}
                        {(hamper.recipientName || hamper.message) && (
                          <p className="pt-1 font-display text-base italic text-ink">
                            {hamper.recipientName && <>For {hamper.recipientName}: </>}{hamper.message && <>“{hamper.message}”</>}{hamper.senderName && <> — {hamper.senderName}</>}
                          </p>
                        )}
                      </div>
                    )}
                    {activeReturn && <p className="mt-3 text-xs text-ink-400">{activeReturn.type === "EXCHANGE" ? "Exchange" : "Return"} request: <span className="text-wine">{RETURN_STATUS_LABEL[activeReturn.status]}</span> · <Link href="/account/returns" className="underline decoration-gold/60 underline-offset-4">View</Link></p>}
                    {eligible && win.until && <ReturnRequest orderItemId={it.id} sizes={sizes} currentSize={it.size} until={win.until.toISOString()} />}
                  </div>
                </li>
              );
            })}
          </ul>
          {order.giftMessage && (
            <div className="mt-6 bg-ivory-200 p-5">
              <p className="eyebrow">Gift message</p>
              <p className="mt-2 font-display text-lg italic">“{order.giftMessage}”</p>
            </div>
          )}
          {canCancel && <div className="mt-8"><CancelOrder number={order.number} /></div>}
        </section>

        <aside className="space-y-6">
          <section className="card p-6">
            <p className="eyebrow mb-4">Order summary</p>
            <dl className="space-y-2.5 text-sm">
              {totals.map(([label, v, free]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-ink-400">{label}</dt>
                  <dd className={v < 0 ? "text-wine" : ""}>{free && v === 0 ? "Complimentary" : v < 0 ? `− ${inr(-v)}` : inr(v)}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-4 border-t border-ink-200/70 pt-3 text-base">
                <dt>Total</dt><dd className="font-medium">{inr(order.total)}</dd>
              </div>
              {order.taxAmount > 0 && <p className="text-right text-xs text-ink-300">Includes GST of {inr(order.taxAmount)}</p>}
            </dl>
          </section>
          <section className="card p-6">
            <p className="eyebrow mb-4">Payment</p>
            <p className="text-sm">{PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}</p>
            <p className="mt-1 text-xs text-ink-400">Status: <span className="text-ink">{PAYMENT_STATUS_LABEL[order.paymentStatus]}</span></p>
          </section>
          {address && (
            <section className="card p-6">
              <p className="eyebrow mb-4">Delivering to</p>
              <address className="text-sm not-italic leading-relaxed text-ink-400">
                <span className="text-ink">{address.name}</span><br />
                {address.line1}{address.line2 && <>, {address.line2}</>}<br />
                {address.landmark && <>{address.landmark}<br /></>}
                {address.city}, {address.state} {address.pincode}<br />
                {address.phone && <>+91 {address.phone}</>}
              </address>
            </section>
          )}
          <p className="px-1 text-xs leading-relaxed text-ink-300">Need help with this order? <Link href="/pages/contact" className="text-wine underline decoration-gold/60 underline-offset-4">Contact client care</Link> and mention {order.number}.</p>
        </aside>
      </div>
    </div>
  );
}
