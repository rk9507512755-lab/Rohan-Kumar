"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, registerAction } from "@/app/actions/account";
import { Checkbox, Field, FormAlert, PasswordField, Submit } from "./fields";
import type { FormState } from "./form-state";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, {} as FormState);
  const e = state.errors ?? {};
  return (
    <form key={state.nonce ?? 0} action={action} noValidate className="space-y-5">
      {next && <input type="hidden" name="next" value={next} />}
      {state.error && <FormAlert tone="error">{state.error}</FormAlert>}
      <Field label="Email address" name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} error={e.email} />
      <div>
        <PasswordField label="Password" name="password" autoComplete="current-password" error={e.password} />
        <div className="mt-2 text-right"><Link href="/account/forgot-password" className="link-underline text-xs text-ink-400 hover:text-wine">Forgot your password?</Link></div>
      </div>
      <Submit pending={pending} pendingLabel="Signing in…" className="w-full">Sign in</Submit>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(registerAction, {} as FormState);
  const e = state.errors ?? {};
  const v = state.values ?? {};
  return (
    <form key={state.nonce ?? 0} action={action} noValidate className="space-y-5">
      {next && <input type="hidden" name="next" value={next} />}
      {state.error && <FormAlert tone="error">{state.error}</FormAlert>}
      <Field label="Full name" name="name" autoComplete="name" required defaultValue={v.name} error={e.name} />
      <Field label="Email address" name="email" type="email" autoComplete="email" required defaultValue={v.email} error={e.email} />
      <Field label="Mobile number" name="phone" type="tel" inputMode="tel" autoComplete="tel-national" optional defaultValue={v.phone} error={e.phone} hint="For order & delivery updates" />
      <PasswordField label="Create password" name="password" autoComplete="new-password" error={e.password} hint="At least 8 characters" />
      <Checkbox name="marketing" defaultChecked={v.marketing === "on"}>Send me early access to new collections, festive edits and private offers. Unsubscribe anytime.</Checkbox>
      <Submit pending={pending} pendingLabel="Creating account…" className="w-full">Create account</Submit>
      <p className="text-center text-xs leading-relaxed text-ink-300">
        By creating an account you agree to our <Link href="/pages/terms" className="underline decoration-gold/60 underline-offset-4 hover:text-wine">Terms</Link> and <Link href="/pages/privacy-policy" className="underline decoration-gold/60 underline-offset-4 hover:text-wine">Privacy Policy</Link>.
      </p>
    </form>
  );
}
