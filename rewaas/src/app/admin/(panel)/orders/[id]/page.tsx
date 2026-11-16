import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { OrderStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { inr } from "@/lib/money";
import { STATUS_LABEL } from "@/lib/orders";
import { fmtDate } from "@/lib/utils";
import { ActionButton, ActionForm, Submit } from "../../../_components/forms";
import { Section, SelectField, TextArea, TextField } from "../../../_components/fields";
import { AddressBlock, HamperContents } from "../../../_components/OrderBits";
import { OrderStatusPill, PageHeader, PaymentPill, ReturnPill, Thumb } from "../../../_components/ui";
import { cancelOrder, setPaymentStatus, updateOrderStatus, updateShipping } from "../actions";

export const metadata: Metadata = { title: "Order" };

const NEXT_STATUSES: OrderStatus[] = ["PENDING_PAYMENT", "CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "RETURN_REQUESTED", "RETURNED"];
const dt = (d: Date) => d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: true,
      events: { orderBy: { createdAt: "desc" } },
      returns: { orderBy: { createdAt: "desc" } },
      user: { select: { id: true, name: true, email: true, _count: { select: { orders: true } } } },
    },
  });
  if (!order) notFound();
  const cancelled = order.status === "CANCELLED";
  const etaValue = order.estimatedDelivery ? order.estimatedDelivery.toISOString().slice(0, 10) : "";

  return (
    <>
      <PageHeader
        title={`Order ${order.number}`}
        back={{ href: "/admin/orders", label: "Orders" }}
        description={
          <span className="flex flex-wrap items-center gap-2">
            Placed {dt(order.createdAt)} <OrderStatusPill status={order.status} /> <PaymentPill status={order.paymentStatus} />
          </span>
        }
        actions={
          <Link href={`/admin/orders/${order.id}/invoice`} target="_blank" className="btn-outline btn-sm">
            Tax invoice ↗
          </Link>
        }
      />
      {cancelled && order.cancelReason && <p className="mb-4 border-l-2 border-wine bg-wine-50 px-3 py-2 text-sm text-wine-700">Cancelled: {order.cancelReason}</p>}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Section title={`Items (${order.items.reduce((a, i) => a + i.quantity, 0)})`}>
            <ul className="divide-y divide-ink-200/60">
              {order.items.map((it) => (
                <li key={it.id} className="flex gap-3 py-3">
                  <Thumb src={it.image} size={64} />
                  <div className="min-w-0 flex-1">
                    {it.productId ? (
                      <Link href={`/admin/products/${it.productId}`} className="font-medium hover:text-wine">
                        {it.name}
                      </Link>
                    ) : (
                      <span className="font-medium">{it.name}</span>
                    )}
                    <p className="text-xs text-ink-400">
                      {[it.size && `Size ${it.size}`, it.colour, it.sku && `SKU ${it.sku}`, `GST ${it.gstRate}%`].filter(Boolean).join(" · ")}
                    </p>
                    {it.kind === "HAMPER" && <HamperContents value={it.hamperConfig} />}
                  </div>
                  <div className="whitespace-nowrap text-right text-sm tabular-nums">
                    <div>
                      {it.quantity} × {inr(it.unitPrice)}
                    </div>
                    <div className="font-medium">{inr(it.total)}</div>
                  </div>
                </li>
              ))}
            </ul>
            <dl className="ml-auto mt-4 max-w-xs space-y-1.5 border-t border-ink-200 pt-4 text-sm">
              <Row label="Subtotal" value={inr(order.subtotal)} />
              {order.discount > 0 && <Row label={`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`} value={`− ${inr(order.discount)}`} />}
              <Row label="Shipping" value={order.shippingFee ? inr(order.shippingFee) : "Free"} />
              {order.codFee > 0 && <Row label="COD fee" value={inr(order.codFee)} />}
              {order.giftWrapFee > 0 && <Row label="Gift wrap" value={inr(order.giftWrapFee)} />}
              <Row label="Total" value={inr(order.total)} strong />
              <Row label="GST included" value={inr(order.taxAmount)} muted />
            </dl>
          </Section>

          {!cancelled && (
            <div className="grid gap-4 md:grid-cols-2">
              <Section title="Update status">
                <ActionForm action={updateOrderStatus.bind(null, order.id)} className="space-y-3" resetOnSuccess>
                  <SelectField name="status" label="New status" defaultValue="" options={[{ value: "", label: "Select…" }, ...NEXT_STATUSES.filter((s) => s !== order.status).map((s) => ({ value: s, label: STATUS_LABEL[s] }))]} />
                  <TextArea name="note" label="Note (shown in timeline)" rows={2} />
                  <Submit>Update status</Submit>
                </ActionForm>
              </Section>
              <Section title="Shipping">
                <ActionForm action={updateShipping.bind(null, order.id)} className="space-y-3">
                  <TextField name="courier" label="Courier" defaultValue={order.courier} placeholder="Delhivery, Blue Dart…" />
                  <TextField name="trackingNumber" label="Tracking number" defaultValue={order.trackingNumber} mono />
                  <TextField name="estimatedDelivery" label="Estimated delivery" type="date" defaultValue={etaValue} />
                  <Submit>Save shipping</Submit>
                </ActionForm>
              </Section>
            </div>
          )}

          <Section title="Timeline">
            <ol className="relative space-y-4 border-l border-ink-200 pl-5">
              {order.events.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[25px] top-1.5 h-2 w-2 rounded-full bg-wine" aria-hidden />
                  <p className="text-sm font-medium">{STATUS_LABEL[e.status]}</p>
                  {e.note && <p className="text-sm text-ink/80">{e.note}</p>}
                  <p className="text-xs text-ink-400">{dt(e.createdAt)}</p>
                </li>
              ))}
              <li className="relative">
                <span className="absolute -left-[25px] top-1.5 h-2 w-2 rounded-full bg-ink-200" aria-hidden />
                <p className="text-sm">Order placed</p>
                <p className="text-xs text-ink-400">{dt(order.createdAt)}</p>
              </li>
            </ol>
          </Section>
        </div>

        <div className="space-y-4">
          <Section title="Customer">
            <p className="text-sm">
              {order.user ? (
                <Link href={`/admin/customers/${order.user.id}`} className="font-medium text-wine hover:underline">
                  {order.user.name}
                </Link>
              ) : (
                <span className="font-medium">Guest checkout</span>
              )}
            </p>
            <p className="text-sm">
              <a href={`mailto:${order.email}`} className="admin-link">
                {order.email}
              </a>
            </p>
            <p className="text-sm">
              <a href={`tel:${order.phone}`} className="admin-link">
                {order.phone}
              </a>
            </p>
            {order.user && <p className="mt-1 text-xs text-ink-400">{order.user._count.orders} orders in total</p>}
          </Section>
          <Section title="Shipping address">
            <AddressBlock value={order.shippingAddress} />
          </Section>
          {order.billingAddress && (
            <Section title="Billing address">
              <AddressBlock value={order.billingAddress} />
            </Section>
          )}
          <Section title="Payment">
            <dl className="space-y-1.5 text-sm">
              <Row label="Method" value={order.paymentMethod === "COD" ? "Cash on delivery" : "Razorpay (online)"} />
              <Row label="Status" value={<PaymentPill status={order.paymentStatus} />} />
              {order.razorpayOrderId && <Row label="Razorpay order" value={<span className="font-mono text-xs">{order.razorpayOrderId}</span>} />}
              {order.razorpayPaymentId && <Row label="Payment ID" value={<span className="font-mono text-xs">{order.razorpayPaymentId}</span>} />}
            </dl>
            <div className="mt-4 flex flex-wrap gap-4">
              {order.paymentMethod === "COD" && order.paymentStatus !== "PAID" && order.paymentStatus !== "REFUNDED" && !cancelled && (
                <ActionButton action={setPaymentStatus.bind(null, order.id, "PAID")} confirm="Mark this COD order as paid (cash collected)?">
                  Mark COD as paid
                </ActionButton>
              )}
              {order.paymentStatus === "PAID" && (
                <ActionButton action={setPaymentStatus.bind(null, order.id, "REFUNDED")} confirm="Mark this payment as refunded? Make sure the refund was issued in Razorpay / to the customer first." className="admin-danger">
                  Mark refunded
                </ActionButton>
              )}
            </div>
          </Section>
          {(order.giftMessage || order.notes) && (
            <Section title="Notes">
              {order.giftMessage && (
                <p className="text-sm">
                  <span className="text-ink-400">Gift message:</span> “{order.giftMessage}”
                </p>
              )}
              {order.notes && <p className="mt-2 text-sm">{order.notes}</p>}
            </Section>
          )}
          {order.returns.length > 0 && (
            <Section title="Returns & exchanges">
              <ul className="space-y-2 text-sm">
                {order.returns.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2">
                    <Link href={`/admin/returns/${r.id}`} className="admin-link">
                      {r.type === "RETURN" ? "Return" : "Exchange"} · {fmtDate(r.createdAt)}
                    </Link>
                    <ReturnPill status={r.status} />
                  </li>
                ))}
              </ul>
            </Section>
          )}
          {!cancelled && !["DELIVERED", "RETURNED"].includes(order.status) && (
            <Section title="Cancel order" description="Stock is restored automatically.">
              <ActionForm action={cancelOrder.bind(null, order.id)} className="space-y-3" confirm="Cancel this order? Stock will be restored and this cannot be undone.">
                <TextArea name="reason" label="Reason" rows={2} />
                <CancelSubmit />
              </ActionForm>
            </Section>
          )}
        </div>
      </div>
    </>
  );
}

function CancelSubmit() {
  return (
    <Submit className="!bg-white !text-wine-700 ring-1 ring-inset ring-wine-200 hover:!bg-wine-50" pendingLabel="Cancelling…">
      Cancel order
    </Submit>
  );
}

function Row({ label, value, strong, muted }: { label: string; value: React.ReactNode; strong?: boolean; muted?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${strong ? "border-t border-ink-200 pt-2 text-base font-medium" : ""} ${muted ? "text-xs text-ink-400" : ""}`}>
      <dt className={strong ? "" : "text-ink-400"}>{label}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </div>
  );
}
