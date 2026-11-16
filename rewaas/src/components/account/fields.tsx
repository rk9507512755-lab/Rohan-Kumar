"use client";

import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Field({ label, name, error, hint, className, children, optional, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; name: string; error?: string; hint?: ReactNode; optional?: boolean; children?: ReactNode }) {
  const id = rest.id ?? `f-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">{label}{optional && <span className="ml-1 normal-case tracking-normal text-ink-300">(optional)</span>}</label>
      {children ?? (
        <input id={id} name={name} aria-invalid={!!error || undefined} aria-describedby={error ? `${id}-err` : undefined}
          className={cn("field", error && "border-wine-400")} {...rest} />
      )}
      {error ? <p id={`${id}-err`} className="field-error">{error}</p> : hint ? <p className="mt-1 text-xs text-ink-300">{hint}</p> : null}
    </div>
  );
}

export function PasswordField({ label, name, error, autoComplete, hint, defaultValue }: { label: string; name: string; error?: string; autoComplete?: string; hint?: ReactNode; defaultValue?: string }) {
  const [show, setShow] = useState(false);
  const id = `f-${name}`;
  return (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      <div className="relative">
        <input id={id} name={name} type={show ? "text" : "password"} autoComplete={autoComplete} required defaultValue={defaultValue}
          aria-invalid={!!error || undefined} aria-describedby={error ? `${id}-err` : undefined} className={cn("field pr-16", error && "border-wine-400")} />
        <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-0 right-0 px-3.5 text-[10px] uppercase tracking-[0.16em] text-ink-400 hover:text-wine" aria-label={show ? "Hide password" : "Show password"}>
          {show ? "Hide" : "Show"}
        </button>
      </div>
      {error ? <p id={`${id}-err`} className="field-error">{error}</p> : hint ? <p className="mt-1 text-xs text-ink-300">{hint}</p> : null}
    </div>
  );
}

export function Checkbox({ name, defaultChecked, children }: { name: string; defaultChecked?: boolean; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-ink-400">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 h-4 w-4 shrink-0 accent-wine" />
      <span>{children}</span>
    </label>
  );
}

export function FormAlert({ tone, children }: { tone: "error" | "ok"; children: ReactNode }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("animate-fadeIn border px-4 py-3 text-sm", tone === "error" ? "border-wine-200 bg-wine-50 text-wine-700" : "border-gold/40 bg-ivory-200 text-ink")}>
      {children}
    </div>
  );
}

export function Submit({ pending, children, pendingLabel, className }: { pending: boolean; children: ReactNode; pendingLabel?: string; className?: string }) {
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={cn("btn-primary", className)}>
      {pending && <span className="h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" aria-hidden />}
      {pending ? pendingLabel ?? "Please wait…" : children}
    </button>
  );
}
