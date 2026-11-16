import type { Metadata } from "next";
import AccountNav from "@/components/account/AccountNav";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "My Account", robots: { index: false, follow: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const first = user.name.split(" ")[0];
  return (
    <div className="container-site pb-8 pt-8 sm:pt-12 lg:pt-14">
      <div className="no-print mb-2 lg:mb-12">
        <p className="eyebrow">My Account</p>
        <p className="mt-2 font-display text-[2rem] leading-tight sm:text-[2.6rem]">Namaste, {first}</p>
      </div>
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-14">
        <aside className="lg:col-span-3 xl:col-span-2">
          <div className="lg:sticky lg:top-28"><AccountNav /></div>
        </aside>
        <div className="min-w-0 lg:col-span-9 xl:col-span-10">{children}</div>
      </div>
    </div>
  );
}
