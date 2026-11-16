import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/account/AuthShell";
import { WhatsAppIcon } from "@/components/icons";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Forgot Password", robots: { index: false } };

export default async function ForgotPasswordPage() {
  const s = await getSettings();
  const wa = `https://wa.me/${s.whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent("Hello REWAAS, I need help resetting the password for my account.")}`;
  // TODO(password-reset): once an email provider is configured, replace this page with a form that
  // (1) rate-limits by email/IP, (2) stores a hashed, single-use token with a ~30 min expiry,
  // (3) emails a /account/reset-password?token=… link, and (4) always shows the same
  // "If an account exists, we've sent a link" message so emails can't be enumerated.
  return (
    <AuthShell image="/photos/cat-sarees.jpg" imageAlt="A REWAAS silk saree" quote="We're here whenever you need us." eyebrow="Account help" title="Forgot your password?"
      intro="Our client care team will help you back into your account — usually within a few hours."
      footer={<p className="text-sm text-ink-400">Remembered it? <Link href="/account/login" className="text-wine underline decoration-gold/60 underline-offset-4">Back to sign in</Link></p>}>
      <div className="space-y-3">
        <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-primary w-full"><WhatsAppIcon size={16} />Chat on WhatsApp</a>
        <a href={`mailto:${s.supportEmail}?subject=${encodeURIComponent("Password reset request")}`} className="btn-outline w-full">Email {s.supportEmail}</a>
      </div>
      <p className="mt-6 text-center text-xs leading-relaxed text-ink-300">
        Please write from the email address registered with your account. For your security, we'll verify your identity before resetting your password. You can also call us on {s.supportPhone}.
      </p>
    </AuthShell>
  );
}
