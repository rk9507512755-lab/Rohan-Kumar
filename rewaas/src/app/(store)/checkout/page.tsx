import type { Metadata } from "next";
import { redirect } from "next/navigation";
import CheckoutClient from "@/components/checkout/CheckoutClient";
import { getCartView } from "@/lib/cart";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings, num } from "@/lib/settings";
import { razorpayEnabled } from "@/lib/razorpay";
import { INDIAN_STATES } from "@/lib/validators";

export const metadata: Metadata = { title: "Secure Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const [cart, user, s] = await Promise.all([getCartView(), getCurrentUser(), getSettings()]);
  if (!cart.lines.length) redirect("/cart");
  const addresses = user ? await db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }) : [];
  return (
    <div className="container-site py-10 lg:py-14">
      <CheckoutClient
        cart={cart}
        user={user ? { name: user.name, email: user.email, phone: user.phone ?? "", preferredPayment: user.preferredPayment } : null}
        addresses={addresses.map((a) => ({ id: a.id, name: a.name, phone: a.phone, line1: a.line1, line2: a.line2 ?? "", landmark: a.landmark ?? "", city: a.city, state: a.state, pincode: a.pincode, isDefault: a.isDefault }))}
        states={INDIAN_STATES}
        fees={{ codFee: num(s.codFee), giftWrapFee: num(s.giftWrapFee), codMaxOrder: num(s.codMaxOrder) }}
        razorpay={razorpayEnabled()}
      />
    </div>
  );
}
