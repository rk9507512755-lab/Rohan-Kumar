import type { Metadata } from "next";
import Link from "next/link";
import PageTitle from "@/components/account/PageTitle";
import { FormAlert } from "@/components/account/fields";
import { PinIcon, PlusIcon } from "@/components/icons";
import { deleteAddressAction, setDefaultAddressAction } from "@/app/actions/account";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Addresses" };

export default async function AddressesPage({ searchParams }: { searchParams: Promise<{ saved?: string; removed?: string }> }) {
  const user = await requireUser("/account/addresses");
  const sp = await searchParams;
  const addresses = await db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
  return (
    <div>
      <PageTitle title="Addresses" text="Save the places you send REWAAS to — home, work, or someone you love."
        action={<Link href="/account/addresses/new" className="btn-primary btn-sm w-full sm:w-auto"><PlusIcon size={14} />Add address</Link>} />
      {(sp.saved || sp.removed) && <div className="mb-6"><FormAlert tone="ok">{sp.saved ? "Your address has been saved." : "The address has been removed."}</FormAlert></div>}
      {addresses.length ? (
        <ul className="grid gap-5 md:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className={`card flex flex-col p-6 ${a.isDefault ? "border-wine/50" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <p className="font-display text-xl">{a.name}</p>
                {a.isDefault && <span className="border border-wine/30 bg-wine-50 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-wine">Default</span>}
              </div>
              <address className="mt-2 flex-1 text-sm not-italic leading-relaxed text-ink-400">
                {a.line1}{a.line2 && <>, {a.line2}</>}<br />
                {a.landmark && <>{a.landmark}<br /></>}
                {a.city}, {a.state} {a.pincode}<br />
                <span className="text-ink">+91 {a.phone}</span>
              </address>
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-ink-200/60 pt-4 text-[11px] uppercase tracking-[0.16em]">
                <Link href={`/account/addresses/${a.id}/edit`} className="link-underline text-ink hover:text-wine">Edit</Link>
                <form action={deleteAddressAction}><input type="hidden" name="id" value={a.id} /><button className="link-underline uppercase tracking-[0.16em] text-ink-400 hover:text-wine">Remove</button></form>
                {!a.isDefault && <form action={setDefaultAddressAction} className="sm:ml-auto"><input type="hidden" name="id" value={a.id} /><button className="link-underline uppercase tracking-[0.16em] text-wine">Set as default</button></form>}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="card px-6 py-14 text-center">
          <PinIcon size={26} className="mx-auto text-gold" />
          <p className="mt-4 font-display text-2xl">No saved addresses</p>
          <p className="mt-2 text-sm text-ink-400">Add one now for a quicker checkout next time.</p>
          <Link href="/account/addresses/new" className="btn-primary mt-6">Add your first address</Link>
        </div>
      )}
    </div>
  );
}
