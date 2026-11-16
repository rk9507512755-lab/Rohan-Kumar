import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Img from "@/components/Img";
import { CheckIcon } from "@/components/icons";
import RefreshCart from "@/components/cart/RefreshCart";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { checkOrderToken } from "@/lib/order-token";
import { STATUS_LABEL } from "@/lib/orders";
import { inr } from "@/lib/money";
import { fmtDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Order Confirmation", robots: { index: false } };

type Addr = { name: string; line1: string; line2?: string; city: string; state: string; pincode: string; phone: string };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ t?: string }> }) {
  const { number } = await params;
  const { t } = await searchParams;
  const [order, session] = await Promise.all([db.order.findUnique({ where: { number }, include: { items: true } }), getSession()]);
  if (!order) notFound();
  const allowed = checkOrderToken(number, t) || (session && (session.uid === order.userId || session.role === "ADMIN"));
  if (!allowed) notFound();
  const a = order.shippingAddress as Addr;
  const pending = order.status === "PENDING_PAYMENT";
  const cancelled = order.status === "CANCELLED";

  return (
    <div className="container-site max-w-4xl py-14 lg:py-20">
      <RefreshCart />
      <div className="text-center">
        <div className={`mx-auto flex h-16 w-16 animate-fadeUp items-center justify-center rounded-full ${cancelled ? "bg-ink-200 text-ink" : "bg-wine text-ivory"}`}><CheckIcon size={30} /></div>
        <p className="eyebrow mt-6">Order {order.number}</p>
        <h1 className="h-display mt-3">{cancelled ? "This order was cancelled" : pending ? "Awaiting payment confirmation" : "Thank you — it's on its way to you."}</h1>
        <p className="lead mx-auto mt-4 max-w-xl">
          {cancelled ? order.cancelReason ?? "No payment was taken." : pending ? "We're confirming your payment with the bank. This page will update — refresh in a minute to see the update." :
            <>We&apos;ll keep you updated at <strong className="font-medium text-ink">{order.email}</strong>. {order.estimatedDelivery && <>Expected delivery by <strong className="font-medium text-ink">{fmtDate(order.estimatedDelivery, { weekday: "long", day: "numeric", month: "long" })}</strong>.</>}</>}
        </p>
      </div>

      <div className="mt-14 grid gap-8 md:grid-cols-[1fr_300px]">
        <div className="bg-white p-6 sm:p-8">
          <h2 className="font-display text-2xl">Your pieces</h2>
          <ul className="mt-5 divide-y divide-ink-200/70">
            {order.items.map((it) => {
              const h = it.hamperConfig as { components?: { name: string; qty: number }[]; packaging?: { name: string } } | null;
              return (
                <li key={it.id} className="flex gap-4 py-4">
                  <div className="relative h-24 w-20 shrink-0 overflow-hidden bg-ivory-200">{it.image && <Img src={it.image} alt={it.name} fill sizes="80px" className="object-cover object-top" />}</div>
                  <div className="flex-1 text-sm">
                    <p className="font-display text-lg leading-snug">{it.name}</p>
                    <p className="mt-1 text-ink-400">{[it.colour, it.size, `Qty ${it.quantity}`].filter(Boolean).join(" · ")}</p>
                    {h?.components && <p className="mt-1 text-xs text-ink-400">{h.components.map((c) => `${c.name}${c.qty > 1 ? ` ×${c.qty}` : ""}`).join(" · ")}{h.packaging ? ` · ${h.packaging.name}` : ""}</p>}
                  </div>
                  <p className="text-sm">{inr(it.total)}</p>
                </li>
              );
            })}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-ink-200/70 pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-ink-400">Subtotal</dt><dd>{inr(order.subtotal)}</dd></div>
            {order.discount > 0 && <div className="flex justify-between text-wine"><dt>Discount {order.couponCode && `(${order.couponCode})`}</dt><dd>−{inr(order.discount)}</dd></div>}
            <div className="flex justify-between"><dt className="text-ink-400">Shipping</dt><dd>{order.shippingFee ? inr(order.shippingFee) : "Complimentary"}</dd></div>
            {order.codFee > 0 && <div className="flex justify-between"><dt className="text-ink-400">COD handling</dt><dd>{inr(order.codFee)}</dd></div>}
            {order.giftWrapFee > 0 && <div className="flex justify-between"><dt className="text-ink-400">Gift wrap</dt><dd>{inr(order.giftWrapFee)}</dd></div>}
            <div className="flex justify-between pt-2 text-base font-medium"><dt>Total</dt><dd>{inr(order.total)}</dd></div>
            <p className="text-xs text-ink-400">Includes GST of {inr(order.taxAmount)}</p>
          </dl>
        </div>
        <div className="space-y-6 text-sm">
          <div className="bg-white p-6"><p className="eyebrow mb-3">Status</p><p className="font-display text-xl">{STATUS_LABEL[order.status]}</p><p className="mt-1 text-ink-400">Placed {fmtDate(order.createdAt)}</p></div>
          <div className="bg-white p-6"><p className="eyebrow mb-3">Delivering to</p><p className="font-medium">{a.name}</p><p className="mt-1 text-ink-400">{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.state} {a.pincode}<br />{a.phone}</p></div>
          <div className="bg-white p-6"><p className="eyebrow mb-3">Payment</p><p>{order.paymentMethod === "COD" ? "Cash on Delivery" : "Paid online via Razorpay"}</p><p className="mt-1 text-ink-400">{order.paymentStatus === "PAID" ? "Payment received" : order.paymentMethod === "COD" ? "Pay when it arrives" : order.paymentStatus.toLowerCase()}</p></div>
          {order.giftMessage && <div className="bg-white p-6"><p className="eyebrow mb-3">Gift message</p><p className="font-display text-lg italic">“{order.giftMessage}”</p></div>}
        </div>
      </div>
      <div className="mt-12 flex flex-wrap justify-center gap-3">
        {session ? <Link href={`/account/orders/${order.number}`} className="btn-primary">View order & tracking</Link> : <Link href={`/track-order?number=${order.number}`} className="btn-primary">Track this order</Link>}
        <Link href="/collections/new-arrivals" className="btn-outline">Continue shopping</Link>
      </div>
      {!session && <p className="mt-6 text-center text-sm text-ink-400">Save your details for next time — <Link href="/account/register" className="text-wine underline underline-offset-4">create an account</Link> with {order.email}.</p>}
    </div>
  );
}
