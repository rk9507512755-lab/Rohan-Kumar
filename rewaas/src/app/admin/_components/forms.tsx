"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { FormAction, FormState } from "../_lib/types";

type Ctx = { state: FormState; pending: boolean };
const FormCtx = createContext<Ctx>({ state: null, pending: false });

/**
 * Form bound to a server action through useActionState.
 * Submits via onSubmit so React does not reset the fields after the action (keeps values on validation errors).
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  id,
  notice = true,
  confirm,
}: {
  action: FormAction;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  id?: string;
  notice?: boolean;
  confirm?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <FormCtx.Provider value={{ state, pending }}>
      <form
        ref={ref}
        id={id}
        className={className}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (confirm && !window.confirm(confirm)) return;
          const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
          const fd = new FormData(e.currentTarget, submitter);
          startTransition(() => formAction(fd));
        }}
      >
        {children}
        {notice && <FormNotice />}
      </form>
    </FormCtx.Provider>
  );
}

export function useFormCtx() {
  return useContext(FormCtx);
}

export function FormNotice({ className }: { className?: string }) {
  const { state } = useContext(FormCtx);
  const [shown, setShown] = useState(state);
  useEffect(() => setShown(state), [state]);
  if (!shown || (!shown.error && !shown.message)) return null;
  return (
    <p
      role={shown.ok ? "status" : "alert"}
      className={cn(
        "col-span-full mt-4 border-l-2 px-3 py-2 text-sm",
        shown.ok ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-wine bg-wine-50 text-wine-700",
        className,
      )}
    >
      {shown.ok ? shown.message : shown.error}
    </p>
  );
}

/** Field-level validation message for `name`. */
export function Err({ name }: { name: string }) {
  const { state } = useContext(FormCtx);
  const m = state?.errors?.[name];
  return m ? (
    <p className="field-error" role="alert">
      {m}
    </p>
  ) : null;
}

export function Submit({ children, className, name, value, pendingLabel = "Saving…" }: { children: ReactNode; className?: string; name?: string; value?: string; pendingLabel?: string }) {
  const { pending } = useContext(FormCtx);
  return (
    <button type="submit" name={name} value={value} disabled={pending} className={cn("btn-primary btn-sm", className)}>
      {pending ? pendingLabel : children}
    </button>
  );
}

/** One-click action (e.g. delete) with optional confirm dialog and inline error. */
export function ActionButton({
  action,
  children,
  confirm,
  className,
  fields,
  title,
  pendingLabel,
}: {
  action: FormAction;
  children: ReactNode;
  confirm?: string;
  className?: string;
  fields?: Record<string, string>;
  title?: string;
  pendingLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form
      action={formAction}
      className="inline-flex flex-col items-start"
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {fields && Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button type="submit" disabled={pending} title={title} className={cn("admin-link", className)}>
        {pending ? pendingLabel ?? "…" : children}
      </button>
      {state?.error && (
        <span role="alert" className="mt-1 max-w-xs text-xs text-wine-700">
          {state.error}
        </span>
      )}
    </form>
  );
}

/** Auto-slug: fills the slug field from the name field until the slug is edited by hand. */
export function SlugFields({
  nameLabel = "Name",
  defaultName = "",
  defaultSlug = "",
  nameField = "name",
}: {
  nameLabel?: string;
  defaultName?: string;
  defaultSlug?: string;
  nameField?: string;
}) {
  const [name, setName] = useState(defaultName);
  const [slug, setSlug] = useState(defaultSlug);
  const [touched, setTouched] = useState(Boolean(defaultSlug));
  const auto = (s: string) =>
    s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-");
  return (
    <>
      <div>
        <label className="field-label" htmlFor={`f-${nameField}`}>
          {nameLabel} *
        </label>
        <input
          id={`f-${nameField}`}
          name={nameField}
          className="field"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!touched) setSlug(auto(e.target.value));
          }}
          required
        />
        <Err name={nameField} />
      </div>
      <div>
        <label className="field-label" htmlFor="f-slug">
          Slug *
        </label>
        <input
          id="f-slug"
          name="slug"
          className="field font-mono text-sm"
          value={slug}
          onChange={(e) => {
            setTouched(true);
            setSlug(e.target.value);
          }}
          required
        />
        <p className="mt-1 text-xs text-ink-400">Used in the URL. Auto-filled from the name; edit if needed.</p>
        <Err name="slug" />
      </div>
    </>
  );
}
