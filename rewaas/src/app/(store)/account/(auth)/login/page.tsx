import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AuthShell from "@/components/account/AuthShell";
import { LoginForm } from "@/components/account/AuthForms";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign In", robots: { index: false } };

function safeNext(n?: string | string[]) {
  const s = typeof n === "string" ? n : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : undefined;
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const next = safeNext((await searchParams).next);
  if (await getSession()) redirect(next ?? "/account");
  const regHref = next ? `/account/register?next=${encodeURIComponent(next)}` : "/account/register";
  return (
    <AuthShell image="/photos/cat-suits-sets.jpg" imageAlt="A woman in a hand-embroidered REWAAS suit set" eyebrow="Welcome back" title="Sign in"
      intro="Track orders, manage your addresses and keep your wishlist close."
      footer={<>
        <p className="font-display text-2xl">New to REWAAS?</p>
        <p className="mt-2 text-sm text-ink-400">Create an account for faster checkout and a wishlist saved across your devices.</p>
        <Link href={regHref} className="btn-outline mt-5 w-full">Create an account</Link>
      </>}>
      <LoginForm next={next} />
    </AuthShell>
  );
}
