import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ActionForm, Err, Submit } from "../_components/forms";
import { adminLogin } from "../actions";

export const metadata: Metadata = { title: "Sign in" };

export default async function AdminLoginPage() {
  const user = await getCurrentUser();
  if (user?.role === "ADMIN") redirect("/admin");
  return (
    <main className="flex min-h-screen items-center justify-center bg-ivory-200/50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-display text-4xl tracking-[0.2em] text-wine">REWAAS</p>
          <p className="mt-1 text-[11px] uppercase tracking-luxe text-ink-400">Back office</p>
        </div>
        <div className="admin-card">
          <h1 className="mb-1 !text-2xl">Sign in</h1>
          <p className="mb-6 text-sm text-ink-400">Admin access only.</p>
          <ActionForm action={adminLogin} className="space-y-4">
            <div>
              <label className="field-label" htmlFor="email">
                Email
              </label>
              <input id="email" name="email" type="email" autoComplete="username" className="field" required />
              <Err name="email" />
            </div>
            <div>
              <label className="field-label" htmlFor="password">
                Password
              </label>
              <input id="password" name="password" type="password" autoComplete="current-password" className="field" required />
              <Err name="password" />
            </div>
            <Submit className="w-full" pendingLabel="Signing in…">
              Sign in
            </Submit>
          </ActionForm>
        </div>
        <p className="mt-6 text-center text-sm">
          <Link href="/" className="admin-link">
            ← Back to the store
          </Link>
        </p>
      </div>
    </main>
  );
}
