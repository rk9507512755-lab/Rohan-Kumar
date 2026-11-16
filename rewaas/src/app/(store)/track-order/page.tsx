import type { Metadata } from "next";
import Link from "next/link";
import TrackOrderForm from "@/components/account/TrackOrderForm";
import { TruckIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Track Your Order",
  description: "Follow your REWAAS order from our atelier to your doorstep. Enter your order number and the email or phone used at checkout.",
  alternates: { canonical: "/track-order" },
};

export default async function TrackOrderPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;
  return (
    <div className="container-site py-12 sm:py-16">
      <header className="mx-auto mb-10 max-w-2xl text-center">
        <TruckIcon size={28} className="mx-auto text-gold" />
        <p className="eyebrow mt-4">Client care</p>
        <h1 className="h-section mt-3">Track Your Order</h1>
        <div className="divider-ornament my-4 text-xs">✦</div>
        <p className="lead">Enter your order number — you'll find it in your confirmation email — along with the email or mobile number used at checkout.</p>
      </header>
      <TrackOrderForm initialNumber={typeof order === "string" ? order.slice(0, 40) : undefined} />
      <p className="mx-auto mt-14 max-w-xl text-center text-sm text-ink-400">
        Questions about your delivery? Read our <Link href="/pages/shipping-policy" className="text-wine underline decoration-gold/60 underline-offset-4">shipping policy</Link> or <Link href="/pages/contact" className="text-wine underline decoration-gold/60 underline-offset-4">contact client care</Link>.
      </p>
    </div>
  );
}
