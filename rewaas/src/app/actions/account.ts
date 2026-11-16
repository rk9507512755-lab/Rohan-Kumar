"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { endSession, getCurrentUser, hashPassword, rateLimit, startSession, verifyPassword } from "@/lib/auth";
import { addressSchema, emailSchema, formErrors, normalizePhone, passwordSchema, phoneSchema, registerSchema } from "@/lib/validators";
import { setOrderStatus, STATUS_LABEL } from "@/lib/orders";
import type { FormState, TimelineStep } from "@/components/account/form-state";
import { CANCEL_REASONS, PAYMENT_PREFS, RETURN_REASONS } from "@/components/account/form-state";
import { buildTimeline, CANCELLABLE, parseAddress, returnWindow } from "@/components/account/order-helpers";

// ---------- helpers ----------

/** Only allow same-site relative paths ("/x", never "//host" or "/\host"). */
function safeNext(raw: FormDataEntryValue | null | undefined, fallback = "/account"): string {
  const n = typeof raw === "string" ? raw.trim() : "";
  if (!n.startsWith("/") || n.startsWith("//") || n.startsWith("/\\") || /[\r\n]/.test(n)) return fallback;
  if (n.startsWith("/account/login") || n.startsWith("/account/register")) return fallback;
  return n;
}

/** Users type "+91 98765-43210"; the shared phone regex wants no separators. */
const cleanPhone = (v: FormDataEntryValue | null | undefined) => String(v ?? "").replace(/[\s\-().]/g, "");

function pick(fd: FormData, keys: string[]): Record<string, string> {
  const o: Record<string, string> = {};
  for (const k of keys) o[k] = String(fd.get(k) ?? "");
  return o;
}

const fail = (error: string | undefined, errors: Record<string, string> | undefined, values?: Record<string, string>): FormState => ({ ok: false, error, errors, values, nonce: Date.now() });

async function signedInUser() {
  const u = await getCurrentUser();
  if (!u) redirect("/account/login");
  return u;
}

async function clientKey() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "local").trim();
}

// ---------- auth ----------

const DUMMY_HASH = "$2b$12$1XPArBkBgaqdtcpeKLs/k.vcNxfWv/yiJ2dEn5ZsFwRMGxvWo/U06";

const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "Enter your password").max(100) });

export async function loginAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = pick(fd, ["email"]);
  const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return fail(undefined, formErrors(parsed.error), values);
  const { email, password } = parsed.data;
  if (!rateLimit(`login:${email}`) || !rateLimit(`login-ip:${await clientKey()}`, 30))
    return fail("Too many attempts. Please wait a few minutes and try again.", undefined, values);
  const user = await db.user.findUnique({ where: { email } });
  // Compare against a dummy hash when the user doesn't exist to keep timing similar.
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) return fail("That email and password don't match our records.", undefined, values);
  await startSession({ id: user.id, role: user.role, name: user.name });
  redirect(safeNext(fd.get("next")));
}

export async function registerAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = pick(fd, ["name", "email", "phone"]);
  values.marketing = fd.get("marketing") ? "on" : "";
  const parsed = registerSchema.safeParse({ name: fd.get("name"), email: fd.get("email"), phone: cleanPhone(fd.get("phone")), password: fd.get("password") });
  if (!parsed.success) return fail(undefined, formErrors(parsed.error), values);
  const { name, email, phone, password } = parsed.data;
  if (!rateLimit(`register:${email}`, 5) || !rateLimit(`register-ip:${await clientKey()}`, 20))
    return fail("Too many attempts. Please try again in a few minutes.", undefined, values);
  const exists = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) return fail(undefined, { email: "An account with this email already exists. Please sign in instead." }, values);
  const user = await db.user.create({
    data: { name, email, phone: phone ? normalizePhone(phone) : null, passwordHash: await hashPassword(password), role: "CUSTOMER", marketingOptIn: !!fd.get("marketing") },
  });
  if (user.marketingOptIn) await db.newsletterSubscriber.upsert({ where: { email }, create: { email, source: "register" }, update: {} }).catch(() => null);
  await startSession({ id: user.id, role: user.role, name: user.name });
  redirect(safeNext(fd.get("next")));
}

export async function logoutAction() {
  await endSession();
  redirect("/");
}

// ---------- profile ----------

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  phone: phoneSchema.optional().or(z.literal("")),
  preferredPayment: z.enum(PAYMENT_PREFS.map((p) => p.value) as [string, ...string[]]).optional().or(z.literal("")),
});

export async function updateProfileAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await signedInUser();
  const values = pick(fd, ["name", "phone", "preferredPayment"]);
  values.marketing = fd.get("marketing") ? "on" : "";
  const parsed = profileSchema.safeParse({ name: fd.get("name"), phone: cleanPhone(fd.get("phone")), preferredPayment: fd.get("preferredPayment") ?? "" });
  if (!parsed.success) return fail(undefined, formErrors(parsed.error), values);
  const { name, phone, preferredPayment } = parsed.data;
  await db.user.update({
    where: { id: user.id },
    data: { name, phone: phone ? normalizePhone(phone) : null, preferredPayment: preferredPayment || null, marketingOptIn: !!fd.get("marketing") },
  });
  if (name !== user.name) await startSession({ id: user.id, role: user.role, name }); // refresh name in the session token
  revalidatePath("/account", "layout");
  return { ok: true, message: "Your details have been updated.", values, nonce: Date.now() };
}

const passwordChangeSchema = z
  .object({ current: z.string().min(1, "Enter your current password"), password: passwordSchema, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords don't match" })
  .refine((d) => d.password !== d.current, { path: ["password"], message: "Choose a password different from your current one" });

export async function changePasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await signedInUser();
  const parsed = passwordChangeSchema.safeParse({ current: fd.get("current"), password: fd.get("password"), confirm: fd.get("confirm") });
  if (!parsed.success) return fail(undefined, formErrors(parsed.error));
  if (!rateLimit(`pw:${user.id}`, 6)) return fail("Too many attempts. Please try again later.", undefined);
  const row = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!row || !(await verifyPassword(parsed.data.current, row.passwordHash))) return fail(undefined, { current: "Your current password is incorrect" });
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.password) } });
  return { ok: true, message: "Password changed successfully.", nonce: Date.now() };
}

// ---------- addresses ----------

const ADDRESS_KEYS = ["name", "phone", "line1", "line2", "landmark", "city", "state", "pincode"];

function parseAddressForm(fd: FormData) {
  const values = pick(fd, ADDRESS_KEYS);
  values.isDefault = fd.get("isDefault") ? "on" : "";
  const parsed = addressSchema.safeParse({ ...values, phone: cleanPhone(values.phone) });
  return { values, parsed };
}

function addressData(d: z.infer<typeof addressSchema>) {
  return { name: d.name, phone: normalizePhone(d.phone), line1: d.line1, line2: d.line2 || null, landmark: d.landmark || null, city: d.city, state: d.state, pincode: d.pincode };
}

export async function createAddressAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await signedInUser();
  const { values, parsed } = parseAddressForm(fd);
  if (!parsed.success) return fail("Please check the highlighted fields.", formErrors(parsed.error), values);
  const count = await db.address.count({ where: { userId: user.id } });
  if (count >= 20) return fail("You can save up to 20 addresses. Please remove one first.", undefined, values);
  const makeDefault = count === 0 || !!fd.get("isDefault");
  await db.$transaction(async (tx) => {
    if (makeDefault) await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    await tx.address.create({ data: { ...addressData(parsed.data), userId: user.id, isDefault: makeDefault } });
  });
  revalidatePath("/account", "layout");
  redirect(safeNext(fd.get("returnTo"), "/account/addresses?saved=1"));
}

export async function updateAddressAction(addressId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const user = await signedInUser();
  const existing = await db.address.findFirst({ where: { id: String(addressId), userId: user.id } });
  if (!existing) return fail("This address could not be found.", undefined);
  const { values, parsed } = parseAddressForm(fd);
  if (!parsed.success) return fail("Please check the highlighted fields.", formErrors(parsed.error), values);
  const makeDefault = existing.isDefault || !!fd.get("isDefault");
  await db.$transaction(async (tx) => {
    if (makeDefault && !existing.isDefault) await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    await tx.address.update({ where: { id: existing.id }, data: { ...addressData(parsed.data), isDefault: makeDefault } });
  });
  revalidatePath("/account", "layout");
  redirect(safeNext(fd.get("returnTo"), "/account/addresses?saved=1"));
}

export async function deleteAddressAction(fd: FormData) {
  const user = await signedInUser();
  const addr = await db.address.findFirst({ where: { id: String(fd.get("id") ?? ""), userId: user.id } });
  if (addr) {
    await db.$transaction(async (tx) => {
      await tx.address.delete({ where: { id: addr.id } });
      if (addr.isDefault) {
        const next = await tx.address.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
        if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    });
  }
  revalidatePath("/account", "layout");
  redirect("/account/addresses?removed=1");
}

export async function setDefaultAddressAction(fd: FormData) {
  const user = await signedInUser();
  const addr = await db.address.findFirst({ where: { id: String(fd.get("id") ?? ""), userId: user.id } });
  if (addr) {
    await db.$transaction([
      db.address.updateMany({ where: { userId: user.id, NOT: { id: addr.id } }, data: { isDefault: false } }),
      db.address.update({ where: { id: addr.id }, data: { isDefault: true } }),
    ]);
  }
  revalidatePath("/account", "layout");
  redirect("/account/addresses");
}

// ---------- orders ----------

const cancelSchema = z.object({
  number: z.string().trim().min(3).max(40),
  reason: z.enum(CANCEL_REASONS as unknown as [string, ...string[]], { errorMap: () => ({ message: "Please choose a reason" }) }),
  details: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function cancelOrderAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await signedInUser();
  const parsed = cancelSchema.safeParse({ number: fd.get("number"), reason: fd.get("reason"), details: fd.get("details") ?? "" });
  if (!parsed.success) return fail(undefined, formErrors(parsed.error));
  const order = await db.order.findFirst({ where: { number: parsed.data.number, userId: user.id } });
  if (!order) return fail("We couldn't find this order on your account.", undefined);
  if (!CANCELLABLE.includes(order.status)) return fail("This order can no longer be cancelled — it may already have shipped. Please contact client care.", undefined);
  const reason = parsed.data.details ? `${parsed.data.reason} — ${parsed.data.details}` : parsed.data.reason;
  await setOrderStatus(order.id, "CANCELLED", "Cancelled by customer");
  await db.order.update({
    where: { id: order.id },
    data: {
      cancelReason: reason,
      // Prepaid orders get refunded by the team; reflect intent if it was paid.
      ...(order.paymentStatus === "PENDING" && order.paymentMethod === "RAZORPAY" ? { paymentStatus: "FAILED" as const } : {}),
    },
  });
  revalidatePath(`/account/orders/${order.number}`);
  revalidatePath("/account/orders");
  return {
    ok: true,
    message: order.paymentStatus === "PAID" ? "Your order has been cancelled. Your refund will be processed to the original payment method within 5–7 business days." : "Your order has been cancelled.",
  };
}

const returnSchema = z
  .object({
    orderItemId: z.string().min(1),
    type: z.enum(["RETURN", "EXCHANGE"], { errorMap: () => ({ message: "Choose return or exchange" }) }),
    reason: z.enum(RETURN_REASONS as unknown as [string, ...string[]], { errorMap: () => ({ message: "Please choose a reason" }) }),
    details: z.string().trim().max(1000).optional().or(z.literal("")),
    exchangeSize: z.string().trim().max(30).optional().or(z.literal("")),
  })
  .refine((d) => d.type !== "EXCHANGE" || !!d.exchangeSize, { path: ["exchangeSize"], message: "Choose the size you'd like instead" });

export async function requestReturnAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await signedInUser();
  const values = pick(fd, ["type", "reason", "details", "exchangeSize"]);
  const parsed = returnSchema.safeParse({ ...values, orderItemId: fd.get("orderItemId") ?? "" });
  if (!parsed.success) return fail(undefined, formErrors(parsed.error), values);
  const item = await db.orderItem.findFirst({
    where: { id: parsed.data.orderItemId, order: { userId: user.id } },
    include: { order: { include: { events: true } }, returns: { select: { status: true } } },
  });
  if (!item) return fail("We couldn't find this item on your account.", undefined, values);
  if (item.kind === "HAMPER") return fail("Personalised hampers aren't eligible for return or exchange.", undefined, values);
  const win = returnWindow(item.order);
  if (!win.open) return fail("The 7-day return window for this order has closed. Please contact client care if something is wrong.", undefined, values);
  if (item.returns.some((r) => r.status !== "REJECTED")) return fail("A request for this item is already in progress.", undefined, values);

  await db.returnRequest.create({
    data: {
      orderId: item.orderId, orderItemId: item.id, userId: user.id, type: parsed.data.type, reason: parsed.data.reason,
      details: parsed.data.details || null, exchangeSize: parsed.data.type === "EXCHANGE" ? parsed.data.exchangeSize || null : null,
    },
  });
  await setOrderStatus(item.orderId, "RETURN_REQUESTED", `${parsed.data.type === "EXCHANGE" ? "Exchange" : "Return"} requested for ${item.name}`);
  revalidatePath(`/account/orders/${item.order.number}`);
  revalidatePath("/account/returns");
  return { ok: true, message: `Your ${parsed.data.type === "EXCHANGE" ? "exchange" : "return"} request has been received. Our team will be in touch within 24–48 hours to arrange a pickup.` };
}

// ---------- public order tracking ----------

export type TrackResult = {
  number: string;
  status: string;
  statusLabel: string;
  placedAt: string;
  city: string;
  pincode: string;
  courier: string | null;
  trackingNumber: string | null;
  estimatedDelivery: string | null;
  items: { name: string; image: string | null; quantity: number; size: string | null; colour: string | null }[];
  steps: TimelineStep[];
};
export type TrackState = FormState & { result?: TrackResult };

const trackSchema = z.object({
  number: z.string().trim().toUpperCase().min(4, "Enter your order number").max(40).transform((s) => s.replace(/^#/, "")),
  contact: z.string().trim().min(5, "Enter the email or phone used for the order").max(120),
});

export async function trackOrderAction(_prev: TrackState, fd: FormData): Promise<TrackState> {
  const values = pick(fd, ["number", "contact"]);
  const parsed = trackSchema.safeParse(values);
  if (!parsed.success) return fail(undefined, formErrors(parsed.error), values);
  if (!rateLimit(`track:${await clientKey()}`, 15)) return fail("Too many lookups. Please wait a few minutes and try again.", undefined, values);
  const notFound = fail("We couldn't find an order matching those details. Please check the order number and the email or phone used at checkout.", undefined, values);

  const order = await db.order.findUnique({
    where: { number: parsed.data.number },
    include: { events: true, items: { select: { name: true, image: true, quantity: true, size: true, colour: true } } },
  });
  if (!order) return notFound;
  const c = parsed.data.contact;
  const matches = c.includes("@")
    ? order.email.trim().toLowerCase() === c.toLowerCase()
    : normalizePhone(c).length === 10 && normalizePhone(c) === normalizePhone(order.phone);
  if (!matches) return notFound;
  const addr = parseAddress(order.shippingAddress);
  return {
    ok: true,
    values,
    result: {
      number: order.number,
      status: order.status,
      statusLabel: STATUS_LABEL[order.status],
      placedAt: order.createdAt.toISOString(),
      city: addr?.city ?? "",
      pincode: addr?.pincode ?? "",
      courier: order.courier,
      trackingNumber: order.trackingNumber,
      estimatedDelivery: order.estimatedDelivery?.toISOString() ?? null,
      items: order.items,
      steps: buildTimeline(order),
    },
  };
}
