import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { inr } from "@/lib/money";
import { fmtDate } from "@/lib/utils";
import { ActionForm, Submit } from "../../../_components/forms";
import { Section, TextArea } from "../../../_components/fields";
import { OrderStatusPill, PageHeader, ReturnPill, Thumb } from "../../../_components/ui";
import { updateReturn } from "../actions";

export const metadata: Metadata = { title: "Return request" };

const ACTIONS: Record<string, { value: string; label: string; hint: string }[]> = {
  REQUESTED: [
    { value: "APPROVED", label: "Approve", hint: "Customer is told the request is accepted." },
    { value: "REJECTED", label: "Reject", hint: "Add a note explaining why." },
  ],
  APPROVED: [
    { value: "PICKED_UP", label: "Mark picked up", hint: "Courier has collected the parcel." },
    { value: "COMPLETED", label: "Complete", hint: "" },
    { value: "REJECTED", label: "Reject", hint: "" },
  ],
  PICKED_UP: [{ value: "COMPLETED", label: "Complete", hint: "" }],
};

export default async function ReturnPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const rr = await db.returnRequest.findUnique({
    where: { id },
    include: { order: { include: { items: true } }, orderItem: true, user: { select: { id: true, name: true, email: true } } },
  });
  if (!rr) notFound();
  const items = rr.orderItem ? [rr.orderItem] : rr.order.items;
  const options = ACTIONS[rr.status] ?? [];
  const completeHint =
    rr.type === "RETURN"
      ? `Completing restores stock for ${rr.orderItem ? "this item" : "the whole order"} and marks the order Returned. Remember to refund the customer.`
      : "Completing records that the replacement was dispatched.";

  return (
    <>
      <PageHeader
        title={`${rr.type === "RETURN" ? "Return" : "Exchange"} request`}
        back={{ href: "/admin/returns", label: "Returns & exchanges" }}
        description={
          <span className="flex flex-wrap items-center gap-2">
            Requested {fmtDate(rr.createdAt)} for order{" "}
            <Link href={`/admin/orders/${rr.orderId}`} className="admin-link">
              {rr.order.number}
            </Link>
            <ReturnPill status={rr.status} />
          </span>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Section title="Request">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="field-label">Reason</dt>
                <dd>{rr.reason}</dd>
              </div>
              {rr.exchangeSize && (
                <div>
                  <dt className="field-label">Exchange for size</dt>
                  <dd className="font-medium">{rr.exchangeSize}</dd>
                </div>
              )}
              {rr.details && (
                <div className="sm:col-span-2">
                  <dt className="field-label">Customer&apos;s details</dt>
                  <dd className="whitespace-pre-line">{rr.details}</dd>
                </div>
              )}
            </dl>
          </Section>
          <Section title={rr.orderItem ? "Item" : "Items (whole order)"}>
            <ul className="divide-y divide-ink-200/60">
              {items.map((it) => (
                <li key={it.id} className="flex items-center gap-3 py-3">
                  <Thumb src={it.image} size={56} />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-medium">{it.name}</p>
                    <p className="text-xs text-ink-400">{[it.size && `Size ${it.size}`, it.colour, it.sku].filter(Boolean).join(" · ")}</p>
                  </div>
                  <p className="whitespace-nowrap text-sm tabular-nums">
                    {it.quantity} × {inr(it.unitPrice)}
                  </p>
                </li>
              ))}
            </ul>
          </Section>
        </div>
        <div className="space-y-4">
          <Section title="Order">
            <p className="text-sm">
              <Link href={`/admin/orders/${rr.orderId}`} className="admin-link">
                {rr.order.number}
              </Link>{" "}
              · {inr(rr.order.total)}
            </p>
            <div className="mt-2">
              <OrderStatusPill status={rr.order.status} />
            </div>
            <p className="mt-3 text-sm">{rr.user ? <Link href={`/admin/customers/${rr.user.id}`} className="admin-link">{rr.user.name}</Link> : rr.order.email}</p>
          </Section>
          <Section title="Action">
            <ActionForm action={updateReturn.bind(null, rr.id)} className="space-y-4">
              {options.length > 0 ? (
                <fieldset>
                  <legend className="field-label">Move request to</legend>
                  <div className="space-y-2">
                    <label className="flex items-start gap-2 text-sm">
                      <input type="radio" name="status" value="" defaultChecked className="mt-1 accent-wine" />
                      <span>No change (just save the note)</span>
                    </label>
                    {options.map((o) => (
                      <label key={o.value} className="flex items-start gap-2 text-sm">
                        <input type="radio" name="status" value={o.value} className="mt-1 accent-wine" />
                        <span>
                          {o.label}
                          <span className="block text-xs text-ink-400">{o.value === "COMPLETED" ? completeHint : o.hint}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : (
                <p className="text-sm text-ink-400">This request is closed.</p>
              )}
              <TextArea name="adminNote" label="Admin note" defaultValue={rr.adminNote} rows={3} hint="Saved with the request (e.g. pickup date, reason for rejection)." />
              <Submit>Save</Submit>
            </ActionForm>
          </Section>
        </div>
      </div>
    </>
  );
}
