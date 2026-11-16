import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AuthShell from "@/components/account/AuthShell";
import { RegisterForm } from "@/components/account/AuthForms";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Create an Account", robots: { index: false } };

function safeNext(n?: string | string[]) {
  const s = typeof n === "string" ? n : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : undefined;
}

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const next = safeNext((await searchParams).next);
  if (await getSession()) redirect(next ?? "/account");
  const loginHref = next ? `/account/login?next=${encodeURIComponent(next)}` : "/account/login";
  return (
    <AuthShell image="/photos/cat-lehengas.jpg" imageAlt="A REWAAS festive lehenga" quote="Crafted for the moments you'll remember." eyebrow="Join REWAAS" title="Create an account"
      intro="Faster checkout, order tracking and early access to new collections."
      footer={<p className="text-sm text-ink-400">Already have an account? <Link href={loginHref} className="text-wine underline decoration-gold/60 underline-offset-4">Sign in</Link></p>}>
      <RegisterForm next={next} />
    </AuthShell>
  );
}
