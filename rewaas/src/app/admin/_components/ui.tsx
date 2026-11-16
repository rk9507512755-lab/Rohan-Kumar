import Link from "next/link";
import type { ReactNode } from "react";
import type { OrderStatus, PaymentStatus, ReturnStatus } from "@prisma/client";
import Img from "@/components/Img";
import { cn } from "@/lib/utils";
import { STATUS_LABEL } from "@/lib/orders";
import { qs } from "../_lib/query";

export function PageHeader({ title, eyebrow, description, actions, back }: { title: string; eyebrow?: string; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-2 inline-block text-xs uppercase tracking-[0.14em] text-ink-400 hover:text-wine">
            ← {back.label}
          </Link>
        )}
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

const TONE: Record<string, string> = {
  neutral: "bg-ink-200/40 text-ink",
  info: "bg-sky-50 text-sky-800 ring-sky-200",
  warn: "bg-amber-50 text-amber-800 ring-amber-200",
  good: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  bad: "bg-wine-50 text-wine-700 ring-wine-100",
};
export function Pill({ tone = "neutral", children }: { tone?: keyof typeof TONE | string; children: ReactNode }) {
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ring-transparent", TONE[tone] ?? TONE.neutral)}>{children}</span>;
}

const ORDER_TONE: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "warn",
  CONFIRMED: "info",
  PROCESSING: "info",
  SHIPPED: "info",
  OUT_FOR_DELIVERY: "info",
  DELIVERED: "good",
  CANCELLED: "bad",
  RETURN_REQUESTED: "warn",
  RETURNED: "neutral",
};
export function OrderStatusPill({ status }: { status: OrderStatus }) {
  return <Pill tone={ORDER_TONE[status]}>{STATUS_LABEL[status]}</Pill>;
}
const PAY_TONE: Record<PaymentStatus, string> = { PENDING: "warn", PAID: "good", FAILED: "bad", REFUNDED: "neutral" };
export function PaymentPill({ status }: { status: PaymentStatus }) {
  return <Pill tone={PAY_TONE[status]}>{status.charAt(0) + status.slice(1).toLowerCase()}</Pill>;
}
const RET_TONE: Record<ReturnStatus, string> = { REQUESTED: "warn", APPROVED: "info", REJECTED: "bad", PICKED_UP: "info", COMPLETED: "good" };
export function ReturnPill({ status }: { status: ReturnStatus }) {
  return <Pill tone={RET_TONE[status]}>{status === "PICKED_UP" ? "Picked up" : status.charAt(0) + status.slice(1).toLowerCase()}</Pill>;
}
export function ActivePill({ active }: { active: boolean }) {
  return <Pill tone={active ? "good" : "neutral"}>{active ? "Active" : "Hidden"}</Pill>;
}

/** Small image preview that tolerates any URL (remote URLs are not optimised). */
export function Thumb({ src, alt = "", size = 48, className }: { src?: string | null; alt?: string; size?: number; className?: string }) {
  if (!src)
    return (
      <div style={{ width: size, height: size }} className={cn("flex shrink-0 items-center justify-center bg-ivory-200 text-[10px] text-ink-300", className)}>
        —
      </div>
    );
  const local = src.startsWith("/");
  return (
    <div style={{ width: size, height: size }} className={cn("relative shrink-0 overflow-hidden bg-ivory-200", className)}>
      <Img src={src} alt={alt} fill sizes={`${size * 2}px`} className="object-cover" unoptimized={!local || undefined} />
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="border border-dashed border-ink-200 bg-white px-6 py-12 text-center text-sm text-ink-400">{children}</div>;
}

export function Pagination({ page, total, perPage, base, params }: { page: number; total: number; perPage: number; base: string; params: Record<string, string> }) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) return <p className="mt-4 text-xs text-ink-400">{total} result{total === 1 ? "" : "s"}</p>;
  const link = (p: number) => `${base}${qs({ ...params, page: p > 1 ? p : undefined })}`;
  return (
    <nav aria-label="Pagination" className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-xs text-ink-400">
        Page {page} of {pages} · {total} results
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link className="chip" href={link(page - 1)} rel="prev">
            ← Previous
          </Link>
        ) : (
          <span className="chip opacity-40">← Previous</span>
        )}
        {page < pages ? (
          <Link className="chip" href={link(page + 1)} rel="next">
            Next →
          </Link>
        ) : (
          <span className="chip opacity-40">Next →</span>
        )}
      </div>
    </nav>
  );
}

export function Stat({ label, value, sub, href }: { label: string; value: ReactNode; sub?: ReactNode; href?: string }) {
  const body = (
    <>
      <p className="text-[11px] uppercase tracking-[0.14em] text-ink-400">{label}</p>
      <p className="mt-2 font-display text-[2rem] leading-none text-ink">{value}</p>
      {sub && <p className="mt-2 text-xs text-ink-400">{sub}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="admin-card block transition hover:border-wine/40">
      {body}
    </Link>
  ) : (
    <div className="admin-card">{body}</div>
  );
}

/** GET filter bar wrapper. */
export function Filters({ children, action, reset }: { children: ReactNode; action: string; reset?: boolean }) {
  return (
    <form action={action} method="get" className="admin-filters mb-5 flex flex-wrap items-end gap-3 border border-ink-200/70 bg-white p-3">
      {children}
      <button className="btn-primary btn-sm" type="submit">
        Apply
      </button>
      {reset && (
        <Link href={action} className="admin-link self-center">
          Reset
        </Link>
      )}
    </form>
  );
}
