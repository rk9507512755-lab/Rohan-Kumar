import "server-only";
import type { OrderStatus } from "@prisma/client";
import { STATUS_LABEL, TRACK_STEPS } from "@/lib/orders";
import type { TimelineStep } from "./form-state";

export const RETURN_WINDOW_DAYS = 7;
export const CANCELLABLE: OrderStatus[] = ["PENDING_PAYMENT", "CONFIRMED", "PROCESSING"];

export type AddressSnapshot = { name: string; phone: string; line1: string; line2?: string; landmark?: string; city: string; state: string; pincode: string };

const str = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");

/** Defensive read of the `shippingAddress` JSON snapshot. */
export function parseAddress(json: unknown): AddressSnapshot | null {
  if (!json || typeof json !== "object") return null;
  const a = json as Record<string, unknown>;
  return { name: str(a.name), phone: str(a.phone), line1: str(a.line1), line2: str(a.line2) || undefined, landmark: str(a.landmark) || undefined, city: str(a.city), state: str(a.state), pincode: str(a.pincode) };
}

export type HamperSnapshot = { box: string | null; packaging: string | null; components: { name: string; qty: number }[]; message: string | null; recipientName: string | null; senderName: string | null };

/** Defensive read of an order item's resolved `hamperConfig` snapshot. */
export function parseHamper(json: unknown): HamperSnapshot | null {
  if (!json || typeof json !== "object") return null;
  const h = json as Record<string, unknown>;
  const obj = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
  const cfg = obj(h.config);
  const comps = Array.isArray(h.components) ? h.components : [];
  return {
    box: str(obj(h.box).name) || null,
    packaging: str(obj(h.packaging).name) || null,
    components: comps.map((c) => ({ name: str(obj(c).name) || "Hamper item", qty: Number(obj(c).qty) || 1 })),
    message: str(cfg.message ?? h.message) || null,
    recipientName: str(cfg.recipientName ?? h.recipientName) || null,
    senderName: str(cfg.senderName ?? h.senderName) || null,
  };
}

type Ev = { status: OrderStatus; createdAt: Date; note: string | null };

/** Date the order was delivered: latest DELIVERED event, else `updatedAt`. */
export function deliveredAt(order: { updatedAt: Date; events: Ev[] }): Date {
  const d = order.events.filter((e) => e.status === "DELIVERED").sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  return d?.createdAt ?? order.updatedAt;
}

export function returnWindow(order: { status: OrderStatus; updatedAt: Date; events: Ev[] }) {
  const delivered = order.status === "DELIVERED" || (order.status === "RETURN_REQUESTED" && order.events.some((e) => e.status === "DELIVERED"));
  if (!delivered) return { open: false, until: null as Date | null };
  const until = new Date(deliveredAt(order).getTime() + RETURN_WINDOW_DAYS * 86400000);
  return { open: Date.now() <= until.getTime(), until };
}

/** Build the customer-facing tracking timeline from the status + recorded events. */
export function buildTimeline(order: { status: OrderStatus; createdAt: Date; events: Ev[] }): TimelineStep[] {
  const latest = (s: OrderStatus) => order.events.filter((e) => e.status === s).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  const iso = (d?: Date | null) => (d ? d.toISOString() : null);
  const { status } = order;
  let reached = -1;
  if (TRACK_STEPS.includes(status)) reached = TRACK_STEPS.indexOf(status);
  else if (status === "RETURN_REQUESTED" || status === "RETURNED") reached = TRACK_STEPS.length - 1;
  else if (status === "CANCELLED") TRACK_STEPS.forEach((s, i) => { if (latest(s)) reached = i; });

  const steps: TimelineStep[] = [];
  if (status === "PENDING_PAYMENT") steps.push({ key: "PENDING_PAYMENT", label: STATUS_LABEL.PENDING_PAYMENT, date: iso(order.createdAt), state: "current", note: "We'll confirm your order as soon as payment is received." });
  TRACK_STEPS.forEach((s, i) => {
    if (status === "CANCELLED" && i > reached) return;
    const ev = latest(s);
    const date = iso(ev?.createdAt ?? (s === "CONFIRMED" && i <= reached ? order.createdAt : null));
    const state: TimelineStep["state"] = i < reached ? "done" : i === reached ? (s === "DELIVERED" || status === "CANCELLED" ? "done" : "current") : "upcoming";
    steps.push({ key: s, label: s === "CONFIRMED" ? "Order confirmed" : STATUS_LABEL[s], date, note: ev?.note ?? null, state });
  });
  if (status === "CANCELLED") {
    const ev = latest("CANCELLED");
    steps.push({ key: "CANCELLED", label: STATUS_LABEL.CANCELLED, date: iso(ev?.createdAt), note: ev?.note ?? null, state: "cancelled" });
  }
  if (status === "RETURN_REQUESTED" || status === "RETURNED") {
    const ev = latest("RETURN_REQUESTED");
    steps.push({ key: "RETURN_REQUESTED", label: STATUS_LABEL.RETURN_REQUESTED, date: iso(ev?.createdAt), note: ev?.note ?? null, state: status === "RETURNED" ? "done" : "current" });
    if (status === "RETURNED") steps.push({ key: "RETURNED", label: STATUS_LABEL.RETURNED, date: iso(latest("RETURNED")?.createdAt), state: "done" });
  }
  return steps;
}

export const PAYMENT_LABEL: Record<string, string> = { RAZORPAY: "Paid online (Razorpay)", COD: "Cash on Delivery" };
export const PAYMENT_STATUS_LABEL: Record<string, string> = { PENDING: "Pending", PAID: "Paid", FAILED: "Failed", REFUNDED: "Refunded" };
export const RETURN_STATUS_LABEL: Record<string, string> = { REQUESTED: "Requested", APPROVED: "Approved", REJECTED: "Declined", PICKED_UP: "Picked up", COMPLETED: "Completed" };
