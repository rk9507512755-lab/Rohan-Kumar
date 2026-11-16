"use client";

import Link from "next/link";
import { useActionState } from "react";
import Img from "@/components/Img";
import { trackOrderAction, type TrackState } from "@/app/actions/account";
import { Field, FormAlert, Submit } from "./fields";
import OrderTimeline from "./OrderTimeline";
import StatusPill from "./StatusPill";

const d = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

export default function TrackOrderForm({ initialNumber }: { initialNumber?: string }) {
  const [state, action, pending] = useActionState(trackOrderAction, {} as TrackState);
  const e = state.errors ?? {};
  const r = state.result;
  return (
    <div className="space-y-12">
      <form key={state.nonce ?? 0} action={action} noValidate className="mx-auto max-w-xl space-y-5">
        {state.error && <FormAlert tone="error">{state.error}</FormAlert>}
        <Field label="Order number" name="number" required placeholder="e.g. RW2Q5K1" autoCapitalize="characters" defaultValue={state.values?.number ?? initialNumber} error={e.number} />
        <Field label="Email or mobile number" name="contact" required placeholder="As used at checkout" defaultValue={state.values?.contact} error={e.contact} />
        <Submit pending={pending} pendingLabel="Looking up…" className="w-full">Track order</Submit>
        <p className="text-center text-xs text-ink-300">Have an account? <Link href="/account/orders" className="text-wine underline decoration-gold/60 underline-offset-4">See all your orders</Link></p>
      </form>

      {r && (
        <section aria-live="polite" className="animate-fadeUp card mx-auto max-w-4xl p-5 sm:p-10">
          <div className="flex flex-col gap-4 border-b border-ink-200/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">Order {r.number}</p>
              <h2 className="mt-2 font-display text-3xl">{r.statusLabel}</h2>
              <p className="mt-1 text-sm text-ink-400">Placed on {d(r.placedAt)}{r.city && <> · Delivering to {r.city}{r.pincode && ` ${r.pincode}`}</>}</p>
            </div>
            <StatusPill status={r.status} label={r.statusLabel} />
          </div>
          <div className="py-8"><OrderTimeline steps={r.steps} /></div>
          {(r.courier || r.estimatedDelivery) && !["CANCELLED", "DELIVERED", "RETURNED"].includes(r.status) && (
            <dl className="grid gap-4 border-t border-ink-200/70 pt-6 text-sm sm:grid-cols-3">
              {r.estimatedDelivery && <div><dt className="field-label">Estimated delivery</dt><dd>{d(r.estimatedDelivery)}</dd></div>}
              {r.courier && <div><dt className="field-label">Courier</dt><dd>{r.courier}</dd></div>}
              {r.trackingNumber && <div><dt className="field-label">Tracking number</dt><dd className="font-mono text-[13px]">{r.trackingNumber}</dd></div>}
            </dl>
          )}
          <ul className="mt-6 divide-y divide-ink-200/70 border-t border-ink-200/70">
            {r.items.map((it, i) => (
              <li key={i} className="flex items-center gap-4 py-4">
                <div className="relative h-20 w-16 shrink-0 overflow-hidden bg-ivory-200">{it.image && <Img src={it.image} alt="" fill sizes="64px" className="object-cover object-top" />}</div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg leading-snug">{it.name}</p>
                  <p className="text-xs text-ink-400">{[it.size, it.colour, `Qty ${it.quantity}`].filter(Boolean).join(" · ")}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
