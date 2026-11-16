"use client";

import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Img from "@/components/Img";
import { useShop } from "@/components/ShopProvider";
import { CouponBox } from "@/components/cart/CartPageClient";
import { LineDetails } from "@/components/CartDrawer";
import { GiftIcon, ShieldIcon } from "@/components/icons";
import { abandonPayment, placeOrder, type CheckoutInput } from "@/app/actions/checkout";
import { checkDelivery } from "@/app/actions/shop";
import type { CartView } from "@/lib/cart";
import { inr } from "@/lib/money";
import { cn } from "@/lib/utils";

type Addr = { id?: string; name: string; phone: string; line1: string; line2: string; landmark: string; city: string; state: string; pincode: string; isDefault?: boolean };
type RazorpayOptions = Record<string, unknown>;
declare global { interface Window { Razorpay?: new (o: RazorpayOptions) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void } } }

const empty: Addr = { name: "", phone: "", line1: "", line2: "", landmark: "", city: "", state: "", pincode: "" };

function Field({ label, error, children, className }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return <div className={className}><label className="field-label">{label}</label>{children}{error && <p className="field-error" role="alert">{error}</p>}</div>;
}

export default function CheckoutClient({ cart: initialCart, user, addresses, states, fees, razorpay }: {
  cart: CartView; user: { name: string; email: string; phone: string; preferredPayment: string | null } | null; addresses: Addr[]; states: string[];
  fees: { codFee: number; giftWrapFee: number; codMaxOrder: number }; razorpay: boolean;
}) {
  const router = useRouter();
  const { setCart: setShared } = useShop();
  const [cart, setCartLocal] = useState(initialCart);
  const setCart = (c: CartView) => { setCartLocal(c); setShared(c); };
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [selected, setSelected] = useState<string | "new">(addresses[0]?.id ?? "new");
  const [addr, setAddr] = useState<Addr>(addresses[0] ?? { ...empty, name: user?.name ?? "", phone: user?.phone ?? "" });
  const [saveAddress, setSaveAddress] = useState(true);
  const [method, setMethod] = useState<"RAZORPAY" | "COD">(razorpay && user?.preferredPayment !== "COD" ? "RAZORPAY" : "COD");
  const [giftWrap, setGiftWrap] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [eta, setEta] = useState<string | null>(null);
  const [codAllowed, setCodAllowed] = useState(true);

  const totals = useMemo(() => {
    const t = cart.totals;
    const codFee = method === "COD" ? fees.codFee : 0;
    const wrap = giftWrap ? fees.giftWrapFee : 0;
    return { ...t, codFee, giftWrapFee: wrap, total: t.total + codFee + wrap };
  }, [cart.totals, method, giftWrap, fees]);
  const codBlocked = !codAllowed || totals.total - totals.codFee + fees.codFee > fees.codMaxOrder;

  const setA = (k: keyof Addr, v: string) => setAddr((a) => ({ ...a, [k]: v }));
  const onPin = async (pin: string) => {
    setA("pincode", pin);
    if (pin.length === 6) {
      const r = await checkDelivery(pin);
      if (r.ok) { setEta(`Estimated delivery by ${r.eta}`); setCodAllowed(r.cod); if (!r.cod && method === "COD" && razorpay) setMethod("RAZORPAY"); }
      else { setEta(null); setErrors((e) => ({ ...e, "address.pincode": r.error })); }
    }
  };

  const submit = async () => {
    setErrors({}); setFormError(null); setPlacing(true);
    const a = selected === "new" ? addr : addresses.find((x) => x.id === selected)!;
    const input: CheckoutInput = {
      email, phone: phone || a.phone, paymentMethod: method, giftWrap, giftMessage, notes, saveAddress: selected === "new" && !!user && saveAddress,
      address: { name: a.name, phone: a.phone, line1: a.line1, line2: a.line2, landmark: a.landmark, city: a.city, state: a.state, pincode: a.pincode },
    };
    const r = await placeOrder(input);
    if (!r.ok) {
      setPlacing(false);
      setFormError(r.error);
      if (r.fieldErrors) { setErrors(r.fieldErrors); if (selected !== "new" && Object.keys(r.fieldErrors).some((k) => k.startsWith("address."))) { setSelected("new"); setAddr(a); } }
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (r.kind === "redirect") { router.push(r.url); return; }
    if (!window.Razorpay) { setPlacing(false); setFormError("Payment window couldn't load. Check your connection and try again."); await abandonPayment(r.orderNumber); return; }
    const rz = new window.Razorpay({
      key: r.razorpay.key, amount: r.razorpay.amount, currency: "INR", order_id: r.razorpay.orderId,
      name: "REWAAS", description: `Order ${r.orderNumber}`, image: "/favicon.svg",
      prefill: { name: r.razorpay.name, email: r.razorpay.email, contact: r.razorpay.contact },
      notes: { orderNumber: r.orderNumber }, theme: { color: "#C4553D" },
      handler: async (resp: unknown) => {
        const v = await fetch("/api/payments/razorpay/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(resp) }).then((x) => x.json()).catch(() => null);
        if (v?.ok) router.push(v.url);
        else { setPlacing(false); setFormError("We couldn't verify your payment. If money was deducted, it will be confirmed automatically within a few minutes — or contact us with your order number " + r.orderNumber + "."); }
      },
      modal: { ondismiss: async () => { await abandonPayment(r.orderNumber); setPlacing(false); setFormError("Payment was cancelled. Your bag is saved — you can try again."); } },
    });
    rz.on("payment.failed", () => { /* Razorpay shows its own retry UI; ondismiss handles release */ });
    rz.open();
  };

  const err = (k: string) => errors[`address.${k}`];
  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="mb-8 flex items-center justify-between">
        <h1 className="h-section">Secure Checkout</h1>
        <p className="hidden items-center gap-2 text-xs text-ink-400 sm:flex"><ShieldIcon size={16} className="text-gold-600" />256-bit encrypted · Payments by Razorpay</p>
      </div>
      {formError && <div role="alert" className="mb-6 border-l-2 border-wine bg-wine-50 px-4 py-3 text-sm text-wine-800">{formError}</div>}
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-16">
        <div className="space-y-12">
          {/* Contact */}
          <section>
            <div className="flex items-baseline justify-between"><h2 className="font-display text-2xl"><span className="mr-3 text-gold-600">01</span>Contact</h2>
              {!user && <Link href="/account/login?next=/checkout" className="text-xs text-wine underline underline-offset-4">Have an account? Sign in</Link>}</div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Email" error={errors.email}><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field" required /></Field>
              <Field label="Mobile number" error={errors.phone}><input type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" className="field" required /></Field>
            </div>
            {!user && <p className="mt-3 text-xs text-ink-400">Checking out as a guest. We&apos;ll send order updates to this email and mobile.</p>}
          </section>

          {/* Address */}
          <section>
            <h2 className="font-display text-2xl"><span className="mr-3 text-gold-600">02</span>Delivery address</h2>
            {addresses.length > 0 && (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {addresses.map((a) => (
                  <label key={a.id} className={cn("cursor-pointer border bg-white p-4 text-sm transition", selected === a.id ? "border-wine" : "border-ink-200 hover:border-ink-300")}>
                    <input type="radio" name="addr" className="sr-only" checked={selected === a.id} onChange={() => { setSelected(a.id!); onPin(a.pincode); }} />
                    <p className="font-medium">{a.name}{a.isDefault && <span className="ml-2 text-[10px] uppercase tracking-[0.14em] text-gold-600">Default</span>}</p>
                    <p className="mt-1 text-ink-400">{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.pincode}</p>
                    <p className="mt-1 text-ink-400">{a.phone}</p>
                  </label>
                ))}
                <label className={cn("flex cursor-pointer items-center justify-center border border-dashed p-4 text-sm transition", selected === "new" ? "border-wine text-wine" : "border-ink-200 text-ink-400 hover:border-ink-300")}>
                  <input type="radio" name="addr" className="sr-only" checked={selected === "new"} onChange={() => { setSelected("new"); setAddr({ ...empty, name: user?.name ?? "" }); }} />+ Add a new address
                </label>
              </div>
            )}
            {selected === "new" && (
              <div className="mt-5 grid animate-fadeIn gap-4 sm:grid-cols-2">
                <Field label="Full name" error={err("name")}><input autoComplete="name" value={addr.name} onChange={(e) => setA("name", e.target.value)} className="field" /></Field>
                <Field label="Mobile for delivery" error={err("phone")}><input type="tel" autoComplete="tel" value={addr.phone} onChange={(e) => setA("phone", e.target.value)} className="field" /></Field>
                <Field label="House / flat, street" error={err("line1")} className="sm:col-span-2"><input autoComplete="address-line1" value={addr.line1} onChange={(e) => setA("line1", e.target.value)} className="field" /></Field>
                <Field label="Area / locality (optional)" error={err("line2")}><input autoComplete="address-line2" value={addr.line2} onChange={(e) => setA("line2", e.target.value)} className="field" /></Field>
                <Field label="Landmark (optional)" error={err("landmark")}><input value={addr.landmark} onChange={(e) => setA("landmark", e.target.value)} className="field" /></Field>
                <Field label="PIN code" error={err("pincode")}><input inputMode="numeric" autoComplete="postal-code" value={addr.pincode} onChange={(e) => onPin(e.target.value.replace(/\D/g, "").slice(0, 6))} className="field" /></Field>
                <Field label="City" error={err("city")}><input autoComplete="address-level2" value={addr.city} onChange={(e) => setA("city", e.target.value)} className="field" /></Field>
                <Field label="State" error={err("state")} className="sm:col-span-2">
                  <select value={addr.state} onChange={(e) => setA("state", e.target.value)} className="field" autoComplete="address-level1"><option value="">Select state</option>{states.map((s) => <option key={s}>{s}</option>)}</select>
                </Field>
                {user && <label className="flex items-center gap-2 text-sm text-ink-400 sm:col-span-2"><input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="accent-[#C4553D]" />Save this address to my account</label>}
              </div>
            )}
            {eta && <p className="mt-3 text-sm text-ink-400">✦ {eta}</p>}
          </section>

          {/* Gifting */}
          <section>
            <h2 className="font-display text-2xl"><span className="mr-3 text-gold-600">03</span>Make it a gift</h2>
            <label className={cn("mt-5 flex cursor-pointer gap-4 border bg-white p-4 transition", giftWrap ? "border-wine" : "border-ink-200")}>
              <input type="checkbox" checked={giftWrap} onChange={(e) => setGiftWrap(e.target.checked)} className="mt-1 accent-[#C4553D]" />
              <span><span className="flex items-center gap-2 font-medium"><GiftIcon size={18} className="text-gold-600" />Signature gift wrap · {inr(fees.giftWrapFee)}</span>
                <span className="mt-1 block text-sm text-ink-400">Hand-wrapped in REWAAS keepsake packaging with a wax seal. Prices are never included in gift parcels.</span></span>
            </label>
            {giftWrap && <div className="mt-3 animate-fadeIn"><Field label="Gift message (optional)"><textarea rows={3} maxLength={300} value={giftMessage} onChange={(e) => setGiftMessage(e.target.value)} className="field" placeholder="Write a few heartfelt words…" /></Field></div>}
            <details className="mt-4"><summary className="cursor-pointer text-xs uppercase tracking-[0.14em] text-ink-400">+ Add delivery instructions</summary><textarea rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} className="field mt-3" /></details>
          </section>

          {/* Payment */}
          <section>
            <h2 className="font-display text-2xl"><span className="mr-3 text-gold-600">04</span>Payment</h2>
            <div className="mt-5 space-y-3">
              <label className={cn("flex cursor-pointer gap-4 border bg-white p-5 transition", method === "RAZORPAY" ? "border-wine" : "border-ink-200", !razorpay && "cursor-not-allowed opacity-60")}>
                <input type="radio" name="pay" disabled={!razorpay} checked={method === "RAZORPAY"} onChange={() => setMethod("RAZORPAY")} className="mt-1 accent-[#C4553D]" />
                <span><span className="font-medium">Pay online</span><span className="mt-1 block text-sm text-ink-400">UPI (GPay, PhonePe, Paytm), credit & debit cards, net banking, wallets and EMI — secured by Razorpay.</span>
                  {!razorpay && <span className="mt-1 block text-xs text-wine">Online payments are being set up — please use Cash on Delivery for now.</span>}</span>
              </label>
              <label className={cn("flex cursor-pointer gap-4 border bg-white p-5 transition", method === "COD" ? "border-wine" : "border-ink-200", codBlocked && "cursor-not-allowed opacity-60")}>
                <input type="radio" name="pay" disabled={codBlocked} checked={method === "COD"} onChange={() => setMethod("COD")} className="mt-1 accent-[#C4553D]" />
                <span><span className="font-medium">Cash on Delivery · +{inr(fees.codFee)}</span><span className="mt-1 block text-sm text-ink-400">Pay by cash or UPI when your order arrives.</span>
                  {codBlocked && <span className="mt-1 block text-xs text-wine">{!codAllowed ? "Not available for this PIN code." : `Available on orders up to ${inr(fees.codMaxOrder)}.`}</span>}</span>
              </label>
            </div>
          </section>
        </div>

        {/* Summary */}
        <aside className="h-fit bg-white p-6 sm:p-8 lg:sticky lg:top-32">
          <h2 className="font-display text-2xl">Order Summary</h2>
          <ul className="mt-5 max-h-[340px] space-y-4 overflow-y-auto pr-1">
            {cart.lines.map((l) => (
              <li key={l.id} className="flex gap-3">
                <div className="relative h-20 w-16 shrink-0 overflow-hidden bg-ivory-200">
                  {l.image && <Img src={l.image} alt={l.name} fill sizes="64px" className="object-cover object-top" />}
                  <span className="absolute -right-0 -top-0 flex h-5 min-w-5 items-center justify-center bg-ink px-1 text-[10px] text-ivory">{l.quantity}</span>
                </div>
                <div className="min-w-0 flex-1 text-sm"><p className="leading-snug">{l.name}</p><LineDetails line={l} /></div>
                <p className="text-sm">{inr(l.unitPrice * l.quantity)}</p>
              </li>
            ))}
          </ul>
          <div className="mt-6"><CouponBox cart={cart} onCart={setCart} /></div>
          <dl className="mt-6 space-y-2.5 border-t border-ink-200/70 pt-5 text-sm">
            <div className="flex justify-between"><dt className="text-ink-400">Subtotal</dt><dd>{inr(totals.subtotal)}</dd></div>
            {totals.discount > 0 && <div className="flex justify-between text-wine"><dt>Discount</dt><dd>−{inr(totals.discount)}</dd></div>}
            <div className="flex justify-between"><dt className="text-ink-400">Shipping</dt><dd>{totals.shippingFee ? inr(totals.shippingFee) : "Complimentary"}</dd></div>
            {totals.codFee > 0 && <div className="flex justify-between"><dt className="text-ink-400">COD handling</dt><dd>{inr(totals.codFee)}</dd></div>}
            {totals.giftWrapFee > 0 && <div className="flex justify-between"><dt className="text-ink-400">Gift wrap</dt><dd>{inr(totals.giftWrapFee)}</dd></div>}
            <div className="flex justify-between border-t border-ink-200/70 pt-4 text-base font-medium"><dt>Total</dt><dd>{inr(totals.total)}</dd></div>
            <p className="text-xs text-ink-400">Includes GST of {inr(totals.taxAmount)}</p>
          </dl>
          <button onClick={submit} disabled={placing} className="btn-primary mt-6 w-full py-4">{placing ? "Placing your order…" : method === "COD" ? "Place Order" : `Pay ${inr(totals.total)}`}</button>
          <p className="mt-4 text-center text-[11px] leading-relaxed text-ink-400">By placing your order you agree to our <Link href="/pages/terms" className="underline">Terms</Link> and <Link href="/pages/returns-exchanges" className="underline">Return Policy</Link>.</p>
        </aside>
      </div>
    </>
  );
}
