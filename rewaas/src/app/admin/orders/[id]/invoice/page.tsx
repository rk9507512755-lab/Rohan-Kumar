import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { inrExact } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { fmtDate } from "@/lib/utils";
import { amountInWords } from "../../../_lib/words";
import { asAddress } from "../../../_components/OrderBits";
import PrintButton from "../../../_components/PrintButton";

export const metadata: Metadata = { title: "Tax invoice" };

const HOME_STATE = "Rajasthan";
const gstIn = (amount: number, rate: number) => amount - amount / (1 + rate / 100);

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [order, s] = await Promise.all([db.order.findUnique({ where: { id }, include: { items: true } }), getSettings()]);
  if (!order) notFound();
  const ship = asAddress(order.shippingAddress);
  const bill = asAddress(order.billingAddress) ?? ship;
  const intra = (ship?.state ?? "").trim().toLowerCase() === HOME_STATE.toLowerCase();

  // Order discount is apportioned across lines in proportion to their value (as at checkout).
  const ratio = order.subtotal ? (order.subtotal - order.discount) / order.subtotal : 1;
  const lines = order.items.map((it) => {
    const amount = it.total * ratio;
    const gst = gstIn(amount, it.gstRate);
    return { it, amount, gst, taxable: amount - gst, lineDiscount: it.total - amount };
  });
  const sum = (f: (l: (typeof lines)[number]) => number) => lines.reduce((a, l) => a + f(l), 0);
  const totGst = sum((l) => l.gst);
  const totTaxable = sum((l) => l.taxable);
  const charges = [
    { label: "Shipping", v: order.shippingFee },
    { label: "Cash on delivery fee", v: order.codFee },
    { label: "Gift wrap", v: order.giftWrapFee },
  ].filter((c) => c.v > 0);
  const r = (n: number) => inrExact(Math.round(n));

  return (
    <div className="min-h-screen bg-ivory-200/50 py-6 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[860px] items-center justify-between px-4">
        <Link href={`/admin/orders/${order.id}`} className="admin-link">
          ← Back to order
        </Link>
        <PrintButton />
      </div>
      <article className="mx-auto max-w-[860px] bg-white p-6 text-[13px] leading-snug text-ink shadow-sm sm:p-10 print:max-w-none print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-wine pb-5">
          <div>
            <p className="font-display text-3xl tracking-[0.2em] text-wine">{s.storeName}</p>
            <p className="mt-2 max-w-xs text-ink/80">{s.address}</p>
            <p className="text-ink/80">
              {s.supportEmail} · {s.supportPhone}
            </p>
            <p className="mt-1 font-medium">GSTIN: {s.gstin}</p>
          </div>
          <div className="text-right">
            <h1 className="!font-sans !text-lg font-medium uppercase tracking-[0.18em]">Tax Invoice</h1>
            <dl className="mt-2 grid grid-cols-[auto_auto] justify-end gap-x-3 gap-y-0.5 text-ink/80">
              <dt>Invoice no.</dt>
              <dd className="font-medium text-ink">INV-{order.number}</dd>
              <dt>Order no.</dt>
              <dd>{order.number}</dd>
              <dt>Date</dt>
              <dd>{fmtDate(order.createdAt)}</dd>
              <dt>Payment</dt>
              <dd>
                {order.paymentMethod === "COD" ? "Cash on delivery" : "Prepaid (online)"} · {order.paymentStatus.toLowerCase()}
              </dd>
              <dt>Place of supply</dt>
              <dd>{ship?.state ?? "—"}</dd>
            </dl>
          </div>
        </header>

        <section className="grid gap-6 border-b border-ink-200 py-5 sm:grid-cols-2">
          {[
            { t: "Bill to", a: bill },
            { t: "Ship to", a: ship },
          ].map(({ t, a }) => (
            <div key={t}>
              <p className="mb-1 text-[10px] uppercase tracking-[0.16em] text-ink-400">{t}</p>
              {a ? (
                <p>
                  <span className="font-medium">{a.name}</span>
                  <br />
                  {a.line1}
                  {a.line2 ? `, ${a.line2}` : ""}
                  <br />
                  {a.city}, {a.state} {a.pincode}
                  <br />
                  {a.phone ?? order.phone} · {order.email}
                </p>
              ) : (
                "—"
              )}
            </div>
          ))}
        </section>

        <div className="overflow-x-auto">
          <table className="mt-5 w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-y border-ink-200 bg-ivory-100 text-left text-[10px] uppercase tracking-[0.08em] text-ink-400">
                <th className="px-2 py-2">#</th>
                <th className="px-2 py-2">Item</th>
                <th className="px-2 py-2 text-right">Qty</th>
                <th className="px-2 py-2 text-right">Rate</th>
                <th className="px-2 py-2 text-right">Discount</th>
                <th className="px-2 py-2 text-right">Taxable value</th>
                <th className="px-2 py-2 text-right">GST %</th>
                {intra ? (
                  <>
                    <th className="px-2 py-2 text-right">CGST</th>
                    <th className="px-2 py-2 text-right">SGST</th>
                  </>
                ) : (
                  <th className="px-2 py-2 text-right">IGST</th>
                )}
                <th className="px-2 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.map(({ it, amount, gst, taxable, lineDiscount }, i) => (
                <tr key={it.id} className="border-b border-ink-200/60 align-top">
                  <td className="px-2 py-2">{i + 1}</td>
                  <td className="px-2 py-2">
                    {it.name}
                    <span className="block text-[11px] text-ink-400">{[it.sku, it.size, it.colour].filter(Boolean).join(" · ")}</span>
                  </td>
                  <td className="px-2 py-2 text-right">{it.quantity}</td>
                  <td className="whitespace-nowrap px-2 py-2 text-right">{r(it.unitPrice)}</td>
                  <td className="whitespace-nowrap px-2 py-2 text-right">{lineDiscount >= 0.5 ? r(lineDiscount) : "—"}</td>
                  <td className="whitespace-nowrap px-2 py-2 text-right">{r(taxable)}</td>
                  <td className="px-2 py-2 text-right">{it.gstRate}%</td>
                  {intra ? (
                    <>
                      <td className="whitespace-nowrap px-2 py-2 text-right">{r(gst / 2)}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-right">{r(gst / 2)}</td>
                    </>
                  ) : (
                    <td className="whitespace-nowrap px-2 py-2 text-right">{r(gst)}</td>
                  )}
                  <td className="whitespace-nowrap px-2 py-2 text-right font-medium">{r(amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-b border-ink-200 font-medium">
                <td colSpan={5} className="px-2 py-2 text-right">
                  Items total
                </td>
                <td className="whitespace-nowrap px-2 py-2 text-right">{r(totTaxable)}</td>
                <td />
                {intra ? (
                  <>
                    <td className="whitespace-nowrap px-2 py-2 text-right">{r(totGst / 2)}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-right">{r(totGst / 2)}</td>
                  </>
                ) : (
                  <td className="whitespace-nowrap px-2 py-2 text-right">{r(totGst)}</td>
                )}
                <td className="whitespace-nowrap px-2 py-2 text-right">{r(sum((l) => l.amount))}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <section className="mt-5 flex flex-wrap justify-between gap-6">
          <div className="max-w-sm text-ink/80">
            <p className="text-[10px] uppercase tracking-[0.16em] text-ink-400">Amount in words</p>
            <p className="mt-1 font-medium text-ink">{amountInWords(order.total)}</p>
            <p className="mt-4 text-[11px]">
              Prices are inclusive of GST. {intra ? `Intra-state supply (${HOME_STATE}): CGST + SGST.` : "Inter-state supply: IGST."}
              {order.couponCode && ` Coupon ${order.couponCode} applied.`}
            </p>
          </div>
          <dl className="w-full max-w-[280px] space-y-1">
            <div className="flex justify-between">
              <dt className="text-ink-400">Subtotal (MRP of items)</dt>
              <dd>{r(order.subtotal)}</dd>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between">
                <dt className="text-ink-400">Discount</dt>
                <dd>− {r(order.discount)}</dd>
              </div>
            )}
            {charges.map((c) => (
              <div key={c.label} className="flex justify-between">
                <dt className="text-ink-400">{c.label}</dt>
                <dd>{r(c.v)}</dd>
              </div>
            ))}
            <div className="flex justify-between border-t border-ink pt-1.5 text-[15px] font-medium">
              <dt>Grand total</dt>
              <dd>{r(order.total)}</dd>
            </div>
            <div className="flex justify-between text-[11px] text-ink-400">
              <dt>of which GST on items</dt>
              <dd>{r(totGst)}</dd>
            </div>
          </dl>
        </section>

        <footer className="mt-10 flex flex-wrap items-end justify-between gap-6 border-t border-ink-200 pt-5 text-[11px] text-ink-400">
          <p className="max-w-md">This is a computer-generated invoice and does not require a physical signature. For any queries write to {s.supportEmail}.</p>
          <p className="text-right">
            For {s.storeName}
            <br />
            <span className="mt-6 inline-block border-t border-ink-200 pt-1">Authorised signatory</span>
          </p>
        </footer>
      </article>
    </div>
  );
}
