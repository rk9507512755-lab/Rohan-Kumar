"use client";

import { useActionState, useState } from "react";
import { cancelOrderAction, requestReturnAction } from "@/app/actions/account";
import { cn } from "@/lib/utils";
import { FormAlert, Submit } from "./fields";
import { CANCEL_REASONS, RETURN_REASONS, type FormState } from "./form-state";

const selectCls = "field appearance-none bg-[length:12px] bg-[right_14px_center] bg-no-repeat pr-10";
const chevron = { backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" };

export function CancelOrder({ number }: { number: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(cancelOrderAction, {} as FormState);
  if (state.ok) return <FormAlert tone="ok">{state.message}</FormAlert>;
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-outline btn-sm w-full sm:w-auto">Cancel order</button>
    );
  const e = state.errors ?? {};
  return (
    <form action={action} className="animate-fadeIn space-y-4 border border-ink-200/70 bg-ivory-50 p-5">
      <input type="hidden" name="number" value={number} />
      <div>
        <p className="font-display text-xl">Cancel this order?</p>
        <p className="mt-1 text-sm text-ink-400">If you've paid online, the full amount is refunded to your original payment method within 5–7 business days.</p>
      </div>
      {state.error && <FormAlert tone="error">{state.error}</FormAlert>}
      <div>
        <label htmlFor="cancel-reason" className="field-label">Reason</label>
        <select id="cancel-reason" name="reason" required defaultValue="" className={selectCls} style={chevron}>
          <option value="" disabled>Choose a reason</option>
          {CANCEL_REASONS.map((r) => <option key={r}>{r}</option>)}
        </select>
        {e.reason && <p className="field-error">{e.reason}</p>}
      </div>
      <div>
        <label htmlFor="cancel-details" className="field-label">Anything else? <span className="normal-case tracking-normal text-ink-300">(optional)</span></label>
        <textarea id="cancel-details" name="details" rows={2} maxLength={500} className="field resize-none" />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Submit pending={pending} pendingLabel="Cancelling…" className="btn-sm">Confirm cancellation</Submit>
        <button type="button" onClick={() => setOpen(false)} className="btn-outline btn-sm">Keep my order</button>
      </div>
    </form>
  );
}

export function ReturnRequest({ orderItemId, sizes, currentSize, until }: { orderItemId: string; sizes: string[]; currentSize: string | null; until: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(requestReturnAction, {} as FormState);
  const [type, setType] = useState<"RETURN" | "EXCHANGE">("EXCHANGE");
  if (state.ok) return <div className="mt-3"><FormAlert tone="ok">{state.message}</FormAlert></div>;
  if (!open)
    return (
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        <button type="button" onClick={() => setOpen(true)} className="link-underline text-[11px] uppercase tracking-[0.16em] text-wine">Return or exchange</button>
        <span className="text-xs text-ink-300">Eligible until {new Date(until).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
      </div>
    );
  const e = state.errors ?? {};
  const v = state.values ?? {};
  const sizeOptions = sizes.filter((s) => s !== currentSize);
  return (
    <form key={state.nonce ?? 0} action={action} className="mt-4 animate-fadeIn space-y-4 border border-ink-200/70 bg-ivory-50 p-4 sm:p-5">
      <input type="hidden" name="orderItemId" value={orderItemId} />
      {state.error && <FormAlert tone="error">{state.error}</FormAlert>}
      <fieldset>
        <legend className="field-label">I'd like to</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["EXCHANGE", "RETURN"] as const).map((t) => (
            <label key={t} className={cn("cursor-pointer border px-3 py-2.5 text-center text-[11px] uppercase tracking-[0.16em] transition", type === t ? "border-wine bg-wine text-ivory" : "border-ink-200 bg-white text-ink hover:border-ink")}>
              <input type="radio" name="type" value={t} checked={type === t} onChange={() => setType(t)} className="sr-only" />
              {t === "EXCHANGE" ? "Exchange size" : "Return for refund"}
            </label>
          ))}
        </div>
      </fieldset>
      {type === "EXCHANGE" && (
        <div>
          <label htmlFor={`xs-${orderItemId}`} className="field-label">New size</label>
          {sizeOptions.length ? (
            <select id={`xs-${orderItemId}`} name="exchangeSize" defaultValue={v.exchangeSize ?? ""} className={selectCls} style={chevron}>
              <option value="" disabled>Choose a size</option>
              {sizeOptions.map((s) => <option key={s}>{s}</option>)}
            </select>
          ) : (
            <input id={`xs-${orderItemId}`} name="exchangeSize" defaultValue={v.exchangeSize} maxLength={30} className="field" placeholder="e.g. M, or a different colour" />
          )}
          {e.exchangeSize && <p className="field-error">{e.exchangeSize}</p>}
        </div>
      )}
      <div>
        <label htmlFor={`rr-${orderItemId}`} className="field-label">Reason</label>
        <select id={`rr-${orderItemId}`} name="reason" defaultValue={v.reason ?? ""} className={selectCls} style={chevron}>
          <option value="" disabled>Choose a reason</option>
          {RETURN_REASONS.map((r) => <option key={r}>{r}</option>)}
        </select>
        {e.reason && <p className="field-error">{e.reason}</p>}
      </div>
      <div>
        <label htmlFor={`rd-${orderItemId}`} className="field-label">Details <span className="normal-case tracking-normal text-ink-300">(optional)</span></label>
        <textarea id={`rd-${orderItemId}`} name="details" rows={3} maxLength={1000} defaultValue={v.details} className="field resize-none" placeholder="Tell us a little more — it helps us get it right." />
      </div>
      <p className="text-xs text-ink-300">Items must be unused, unwashed and with original tags. Damaged on arrival? Please keep your unboxing video handy.</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Submit pending={pending} pendingLabel="Submitting…" className="btn-sm">Submit request</Submit>
        <button type="button" onClick={() => setOpen(false)} className="btn-outline btn-sm">Not now</button>
      </div>
    </form>
  );
}

export function PrintButton() {
  return <button type="button" onClick={() => window.print()} className="btn-primary btn-sm">Print / Save as PDF</button>;
}
