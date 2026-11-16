import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Err } from "./forms";

type Base = { name: string; label: string; hint?: ReactNode; className?: string; required?: boolean };

export function TextField({
  name,
  label,
  hint,
  className,
  required,
  defaultValue,
  type = "text",
  placeholder,
  inputMode,
  step,
  min,
  mono,
}: Base & {
  defaultValue?: string | number | null;
  type?: string;
  placeholder?: string;
  inputMode?: "numeric" | "decimal" | "email" | "tel" | "url" | "text";
  step?: string;
  min?: string;
  mono?: boolean;
}) {
  return (
    <div className={className}>
      <label className="field-label" htmlFor={`f-${name}`}>
        {label}
        {required && " *"}
      </label>
      <input
        id={`f-${name}`}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        inputMode={inputMode}
        step={step}
        min={min}
        className={cn("field", mono && "font-mono text-sm")}
      />
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
      <Err name={name} />
    </div>
  );
}

export function MoneyField(props: Base & { defaultPaise?: number | null; placeholder?: string }) {
  const v = props.defaultPaise == null ? "" : (props.defaultPaise / 100).toFixed(props.defaultPaise % 100 ? 2 : 0);
  return (
    <div className={props.className}>
      <label className="field-label" htmlFor={`f-${props.name}`}>
        {props.label}
        {props.required && " *"}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400">₹</span>
        <input id={`f-${props.name}`} name={props.name} inputMode="decimal" defaultValue={v} placeholder={props.placeholder} className="field pl-8" />
      </div>
      {props.hint && <p className="mt-1 text-xs text-ink-400">{props.hint}</p>}
      <Err name={props.name} />
    </div>
  );
}

export function TextArea({ name, label, hint, className, required, defaultValue, rows = 4, mono }: Base & { defaultValue?: string | null; rows?: number; mono?: boolean }) {
  return (
    <div className={className}>
      <label className="field-label" htmlFor={`f-${name}`}>
        {label}
        {required && " *"}
      </label>
      <textarea id={`f-${name}`} name={name} rows={rows} defaultValue={defaultValue ?? ""} className={cn("field leading-relaxed", mono && "font-mono text-sm")} />
      {hint && <div className="mt-1 text-xs text-ink-400">{hint}</div>}
      <Err name={name} />
    </div>
  );
}

export function SelectField({
  name,
  label,
  hint,
  className,
  required,
  defaultValue,
  options,
}: Base & { defaultValue?: string | null; options: { value: string; label: string }[] }) {
  return (
    <div className={className}>
      <label className="field-label" htmlFor={`f-${name}`}>
        {label}
        {required && " *"}
      </label>
      <select id={`f-${name}`} name={name} defaultValue={defaultValue ?? ""} className="field">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
      <Err name={name} />
    </div>
  );
}

export function Check({ name, label, defaultChecked, value, hint }: { name: string; label: ReactNode; defaultChecked?: boolean; value?: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm">
      <input type="checkbox" name={name} value={value ?? "on"} defaultChecked={defaultChecked} className="mt-0.5 h-4 w-4 accent-wine" />
      <span>
        {label}
        {hint && <span className="block text-xs text-ink-400">{hint}</span>}
      </span>
    </label>
  );
}

export function Section({ title, description, children, className, actions }: { title: string; description?: ReactNode; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={cn("admin-card", className)}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-ink-200/60 pb-3">
        <div>
          <h2 className="font-sans text-[15px] font-medium tracking-normal text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-ink-400">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
