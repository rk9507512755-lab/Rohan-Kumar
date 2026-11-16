"use client";

import { useActionState } from "react";
import { changePasswordAction, updateProfileAction } from "@/app/actions/account";
import { cn } from "@/lib/utils";
import { Checkbox, Field, FormAlert, PasswordField, Submit } from "./fields";
import { PAYMENT_PREFS, type FormState } from "./form-state";

type Profile = { name: string; email: string; phone: string | null; preferredPayment: string | null; marketingOptIn: boolean };

export function ProfileForm({ user }: { user: Profile }) {
  const [state, action, pending] = useActionState(updateProfileAction, {} as FormState);
  const e = state.errors ?? {};
  const v = state.values;
  const pref = v ? v.preferredPayment : user.preferredPayment ?? "";
  return (
    <form key={state.nonce ?? 0} action={action} noValidate className="space-y-6">
      {state.error && <FormAlert tone="error">{state.error}</FormAlert>}
      {state.ok && state.message && <FormAlert tone="ok">{state.message}</FormAlert>}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" name="name" autoComplete="name" required defaultValue={v?.name ?? user.name} error={e.name} />
        <Field label="Mobile number" name="phone" type="tel" inputMode="tel" optional defaultValue={v?.phone ?? user.phone ?? ""} error={e.phone} />
        <Field className="sm:col-span-2" label="Email address" name="email_display" value={user.email} readOnly disabled hint="To change your sign-in email, please contact client care." />
      </div>

      <fieldset>
        <legend className="field-label">Preferred payment method</legend>
        <p className="mb-3 text-xs text-ink-300">We'll pre-select this at checkout. Card details are never stored by REWAAS — payments are handled securely by Razorpay.</p>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {PAYMENT_PREFS.map((p) => (
            <label key={p.value} className={cn("flex cursor-pointer items-start gap-3 border bg-white px-4 py-3.5 transition has-[:checked]:border-wine has-[:checked]:bg-wine-50/50", "border-ink-200 hover:border-ink-300")}>
              <input type="radio" name="preferredPayment" value={p.value} defaultChecked={pref === p.value} className="mt-1 accent-wine" />
              <span>
                <span className="block text-sm text-ink">{p.label}</span>
                <span className="block text-xs text-ink-300">{p.hint}</span>
              </span>
            </label>
          ))}
        </div>
        {e.preferredPayment && <p className="field-error">{e.preferredPayment}</p>}
      </fieldset>

      <Checkbox name="marketing" defaultChecked={v ? v.marketing === "on" : user.marketingOptIn}>Email me about new collections, festive edits and private offers.</Checkbox>
      <Submit pending={pending} pendingLabel="Saving…" className="w-full sm:w-auto">Save changes</Submit>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, {} as FormState);
  const e = state.errors ?? {};
  return (
    <form key={state.nonce ?? 0} action={action} noValidate className="space-y-5">
      {state.error && <FormAlert tone="error">{state.error}</FormAlert>}
      {state.ok && state.message && <FormAlert tone="ok">{state.message}</FormAlert>}
      <PasswordField label="Current password" name="current" autoComplete="current-password" error={e.current} />
      <div className="grid gap-5 sm:grid-cols-2">
        <PasswordField label="New password" name="password" autoComplete="new-password" error={e.password} hint="At least 8 characters" />
        <PasswordField label="Confirm new password" name="confirm" autoComplete="new-password" error={e.confirm} />
      </div>
      <Submit pending={pending} pendingLabel="Updating…" className="w-full sm:w-auto">Update password</Submit>
    </form>
  );
}
