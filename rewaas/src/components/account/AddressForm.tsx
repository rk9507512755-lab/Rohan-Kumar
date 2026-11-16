"use client";

import Link from "next/link";
import { useActionState } from "react";
import { INDIAN_STATES } from "@/lib/validators";
import { cn } from "@/lib/utils";
import { Checkbox, Field, FormAlert, Submit } from "./fields";
import type { AddressValues, FormState } from "./form-state";

export type AddressFormProps = {
  /** Server action `(prev, formData) => FormState`. Reads fields name, phone, line1, line2, landmark, city, state, pincode, isDefault, returnTo. */
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial?: Partial<AddressValues>;
  submitLabel?: string;
  /** Renders a "Cancel" link next to the submit button. */
  cancelHref?: string;
  /** Show the "make default" checkbox (default true). */
  showDefaultToggle?: boolean;
  /** Extra hidden fields, e.g. { returnTo: "/checkout" }. */
  hidden?: Record<string, string>;
  className?: string;
};

/** Reusable Indian address form (account & checkout). */
export default function AddressForm({ action, initial = {}, submitLabel = "Save address", cancelHref, showDefaultToggle = true, hidden, className }: AddressFormProps) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);
  const e = state.errors ?? {};
  const v = (k: keyof AddressValues) => state.values?.[k] ?? (initial[k] == null ? "" : String(initial[k]));
  const isDefault = state.values ? state.values.isDefault === "on" : !!initial.isDefault;

  return (
    <form key={state.nonce ?? 0} action={formAction} noValidate className={cn("grid gap-5 sm:grid-cols-2", className)}>
      {hidden && Object.entries(hidden).map(([k, val]) => <input key={k} type="hidden" name={k} value={val} />)}
      {state.error && <div className="sm:col-span-2"><FormAlert tone="error">{state.error}</FormAlert></div>}
      <Field label="Full name" name="name" autoComplete="name" required defaultValue={v("name")} error={e.name} />
      <Field label="Mobile number" name="phone" type="tel" inputMode="tel" autoComplete="tel-national" required defaultValue={v("phone")} error={e.phone} hint="For delivery updates from our courier partner" />
      <Field className="sm:col-span-2" label="Flat, house no., building, street" name="line1" autoComplete="address-line1" required defaultValue={v("line1")} error={e.line1} />
      <Field className="sm:col-span-2" label="Area, colony, sector" name="line2" optional autoComplete="address-line2" defaultValue={v("line2")} error={e.line2} />
      <Field label="Landmark" name="landmark" optional defaultValue={v("landmark")} error={e.landmark} placeholder="e.g. Near City Palace" />
      <Field label="PIN code" name="pincode" inputMode="numeric" maxLength={6} autoComplete="postal-code" required defaultValue={v("pincode")} error={e.pincode} />
      <Field label="City / Town" name="city" autoComplete="address-level2" required defaultValue={v("city")} error={e.city} />
      <Field label="State / UT" name="state" error={e.state}>
        <select id="f-state" name="state" required defaultValue={v("state")} autoComplete="address-level1" aria-invalid={!!e.state || undefined} className={cn("field appearance-none bg-[length:12px] bg-[right_14px_center] bg-no-repeat pr-10", e.state && "border-wine-400")}
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}>
          <option value="" disabled>Select state</option>
          {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      {showDefaultToggle && <div className="sm:col-span-2"><Checkbox name="isDefault" defaultChecked={isDefault}>Make this my default delivery address</Checkbox></div>}
      <div className="flex flex-col-reverse gap-3 pt-2 sm:col-span-2 sm:flex-row sm:items-center">
        <Submit pending={pending} pendingLabel="Saving…" className="w-full sm:w-auto">{submitLabel}</Submit>
        {cancelHref && <Link href={cancelHref} className="btn-outline w-full sm:w-auto">Cancel</Link>}
      </div>
    </form>
  );
}
