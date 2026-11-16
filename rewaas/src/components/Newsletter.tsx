"use client";

import { useActionState } from "react";
import { subscribeNewsletter } from "@/app/actions/shop";

export default function Newsletter({ source = "home", dark = false }: { source?: string; dark?: boolean }) {
  const [state, action, pending] = useActionState(subscribeNewsletter, null);
  if (state?.ok) return <p className={`font-display text-xl italic ${dark ? "text-gold-300" : "text-wine"}`}>{state.message}</p>;
  return (
    <form action={action} className="w-full" noValidate>
      <input type="hidden" name="source" value={source} />
      <div className={`flex border-b ${dark ? "border-ivory/50" : "border-ink/60"}`}>
        <label htmlFor={`nl-${source}`} className="sr-only">Email address</label>
        <input id={`nl-${source}`} name="email" type="email" required placeholder="Your email address" autoComplete="email"
          className={`min-w-0 flex-1 bg-transparent py-3 text-[15px] outline-none ${dark ? "text-ivory placeholder:text-ivory/50" : "placeholder:text-ink-300"}`} />
        <button disabled={pending} className={`px-1 text-[11px] uppercase tracking-[0.2em] ${dark ? "text-gold-300 hover:text-ivory" : "text-wine hover:text-ink"}`}>{pending ? "…" : "Subscribe"}</button>
      </div>
      {state && !state.ok && <p className="mt-2 text-xs text-gold-300">{state.message}</p>}
    </form>
  );
}
