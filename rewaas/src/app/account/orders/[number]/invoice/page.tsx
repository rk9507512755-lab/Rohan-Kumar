import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/components/account/OrderActions";
import { PAYMENT_LABEL, PAYMENT_STATUS_LABEL, parseAddress, parseHamper } from "@/components/account/order-helpers";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { inrExact } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { fmtDate } from "@/lib/utils";

// Lives outside the (store) group on purpose: a clean, chrome-free page that prints as a proper A4 invoice.
type Props = { params: Promise<{ number: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Invoice ${(await params).number}`, robots: { index: false, follow: false } };
}

/** GST included in a GST-inclusive amount (paise). */
const gstIn = (amount: number, rate: number) => amount - amount / (1 + rate / 100);

export default async function InvoicePage({ params }: Props) {
  const { number } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/account/login?next=${encodeURIComponent(`/account/orders/${number}/invoice`)}`);
  const [order, s] = await Promise.all([
    db.order.findFirst({ where: { number, userId: user.id }, include: { items: true } }),
    getSettings(),
  ]);
  if (!order || order.status === "PENDING_PAYMENT") notFound();

  const ship = parseAddress(order.shippingAddress);
  const bill = parseAddress(order.billingAddress) ?? ship;
  const intraState = !!ship?.state && s.address.toLowerCase().includes(ship.state.toLowerCase());
  const lines = order.items.map((it) => {
    const gst = gstIn(it.total, it.gstRate);
    return { ...it, gst, taxable: it.total - gst, hamper: it.kind === "HAMPER" ? parseHamper(it.hamperConfig) : null };
  });
  const lineGst = lines.reduce((a, l) => a + l.gst, 0);
  const totalGst = order.taxAmount > 0 ? order.taxAmount : lineGst;
  const charges: [string, number][] = [
    ["Shipping", order.shippingFee],
    ["COD handling fee", order.codFee],
    ["Gift wrap", order.giftWrapFee],
  ].filter(([, v]) => (v as number) > 0) as [string, number][];

  return (
    <div className="min-h-screen bg-ivory-200 py-6 print:bg-white print:py-0 sm:py-10">
      <div className="no-print mx-auto mb-5 flex max-w-[860px] items-center justify-between gap-3 px-4">
        <Link href={`/account/orders/${order.number}`} className="text-[11px] uppercase tracking-[0.16em] text-ink-400 hover:text-wine">← Back to order</Link>
        <PrintButton />
      </div>
      <article className="mx-auto max-w-[860px] bg-white px-5 py-8 text-[13px] text-ink shadow-[0_20px_60px_-40px_rgba(0,0,0,.35)] print:max-w-none print:px-0 print:py-0 print:shadow-none sm:px-12 sm:py-12">
        <header className="flex flex-col gap-6 border-b border-ink-200 pb-8 sm:flex-row sm:justify-between">
          <div>
            <p className="font-display text-3xl tracking-[0.3em]">{s.storeName}</p>
            <p className="mt-1 text-[9px] uppercase tracking-[0.4em] text-gold-600">{s.tagline}</p>
            <p className="mt-4 max-w-xs leading-relaxed text-ink-400">{s.address}</p>
            <p className="mt-1 text-ink-400">GSTIN: <span className="text-ink">{s.gstin}</span></p>
            <p className="text-ink-400">{s.supportEmail} · {s.supportPhone}</p>
          </div>
          <div className="sm:text-right">
            <p className="font-display text-2xl">Tax Invoice</p>
            <dl className="mt-3 space-y-0.5 text-ink-400">
              <div><dt className="inline">Invoice no. </dt><dd className="inline text-ink">INV-{order.number}</dd></div>
              <div><dt className="inline">Order no. </dt><dd className="inline text-ink">{order.number}</dd></div>
              <div><dt className="inline">Date </dt><dd className="inline text-ink">{fmtDate(order.createdAt, { day: "2-digit", month: "short", year: "numeric" })}</dd></div>
              <div><dt className="inline">Payment </dt><dd className="inline text-ink">{PAYMENT_LABEL[order.paymentMethod]} · {PAYMENT_STATUS_LABEL[order.paymentStatus]}</dd></div>
              {ship?.state && <div><dt className="inline">Place of supply </dt><dd className="inline text-ink">{ship.state}</dd></div>}
            </dl>
          </div>
        </header>

        <section className="grid gap-6 border-b border-ink-200 py-6 sm:grid-cols-2">
          {[["Billed to", bill], ["Shipped to", ship]].map(([label, a]) => {
            const ad = a as typeof ship;
            return (
              <div key={label as string}>
                <p className="mb-1.5 text-[10px] uppercase tracking-[0.18em] text-ink-400">{label as string}</p>
                {ad ? (
                  <p className="leading-relaxed">
                    <span className="font-medium">{ad.name}</span><br />
                    {ad.line1}{ad.line2 && `, ${ad.line2}`}<br />
                    {ad.landmark && <>{ad.landmark}<br /></>}
                    {ad.city}, {ad.state} {ad.pincode}<br />
                    {ad.phone && `+91 ${ad.phone}`}
                  </p>
                ) : <p className="text-ink-400">—</p>}
                {label === "Billed to" && <p className="mt-1 text-ink-400">{order.email}</p>}
              </div>
            );
          })}
        </section>

        <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          <table className="mt-6 w-full min-w-[560px] border-collapse">
            <thead>
              <tr className="border-b border-ink text-left text-[10px] uppercase tracking-[0.14em] text-ink-400">
                <th className="py-2 pr-3 font-normal">#</th>
                <th className="py-2 pr-3 font-normal">Item</th>
                <th className="py-2 pr-3 text-right font-normal">Qty</th>
                <th className="py-2 pr-3 text-right font-normal">Taxable value</th>
                <th className="py-2 pr-3 text-right font-normal">GST</th>
                <th className="py-2 text-right font-normal">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={l.id} className="border-b border-ink-200 align-top">
                  <td className="py-3 pr-3 text-ink-400">{i + 1}</td>
                  <td className="py-3 pr-3">
                    <p className="font-medium">{l.name}</p>
                    <p className="text-[11px] text-ink-400">{[l.sku && `SKU ${l.sku}`, l.size, l.colour].filter(Boolean).join(" · ")}</p>
                    {l.hamper && l.hamper.components.length > 0 && <p className="mt-0.5 text-[11px] text-ink-400">{[l.hamper.box, ...l.hamper.components.map((c) => `${c.name} × ${c.qty}`), l.hamper.packaging].filter(Boolean).join(", ")}</p>}
                  </td>
                  <td className="py-3 pr-3 text-right">{l.quantity}</td>
                  <td className="py-3 pr-3 text-right">{inrExact(l.taxable)}</td>
                  <td className="py-3 pr-3 text-right">
                    {inrExact(l.gst)}
                    <span className="block text-[10px] text-ink-400">{intraState ? `CGST ${l.gstRate / 2}% + SGST ${l.gstRate / 2}%` : `IGST ${l.gstRate}%`}</span>
                  </td>
                  <td className="py-3 text-right">{inrExact(l.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="mt-6 flex justify-end">
          <dl className="w-full max-w-xs space-y-1.5">
            <div className="flex justify-between"><dt className="text-ink-400">Items subtotal</dt><dd>{inrExact(order.subtotal)}</dd></div>
            {order.discount > 0 && <div className="flex justify-between"><dt className="text-ink-400">Discount{order.couponCode ? ` (${order.couponCode})` : ""}</dt><dd>− {inrExact(order.discount)}</dd></div>}
            {charges.map(([label, v]) => <div key={label} className="flex justify-between"><dt className="text-ink-400">{label}</dt><dd>{inrExact(v)}</dd></div>)}
            {order.shippingFee === 0 && <div className="flex justify-between"><dt className="text-ink-400">Shipping</dt><dd>Free</dd></div>}
            <div className="flex justify-between border-t border-ink pt-2 text-[15px] font-medium"><dt>Grand total</dt><dd>{inrExact(order.total)}</dd></div>
            <div className="flex justify-between text-[11px] text-ink-400">
              <dt>Includes GST{intraState ? " (CGST + SGST)" : " (IGST)"}</dt><dd>{inrExact(totalGst)}</dd>
            </div>
          </dl>
        </section>

        <footer className="mt-12 border-t border-ink-200 pt-6 text-[11px] leading-relaxed text-ink-400">
          <p>All prices are inclusive of GST. This is a computer-generated invoice and does not require a signature.</p>
          <p className="mt-1">Thank you for choosing {s.storeName} — {s.tagline}</p>
        </footer>
      </article>
    </div>
  );
}
