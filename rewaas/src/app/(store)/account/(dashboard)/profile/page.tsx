import type { Metadata } from "next";
import PageTitle from "@/components/account/PageTitle";
import { PasswordForm, ProfileForm } from "@/components/account/ProfileForms";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser("/account/profile");
  return (
    <div className="max-w-3xl">
      <PageTitle title="Profile" text="Your personal details and checkout preferences." />
      <ProfileForm user={{ name: user.name, email: user.email, phone: user.phone, preferredPayment: user.preferredPayment, marketingOptIn: user.marketingOptIn }} />
      <section className="mt-16">
        <h2 className="font-display text-2xl sm:text-3xl">Change password</h2>
        <p className="mb-6 mt-1.5 text-sm text-ink-400">Use at least 8 characters — a short phrase is easy to remember and hard to guess.</p>
        <PasswordForm />
      </section>
    </div>
  );
}
