import type { Metadata } from "next";
import AddressForm from "@/components/account/AddressForm";
import PageTitle from "@/components/account/PageTitle";
import { createAddressAction } from "@/app/actions/account";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Add Address" };

export default async function NewAddressPage() {
  const user = await requireUser("/account/addresses/new");
  const count = await db.address.count({ where: { userId: user.id } });
  return (
    <div className="max-w-3xl">
      <PageTitle title="Add a new address" text="We deliver to over 26,000 PIN codes across India." />
      <AddressForm action={createAddressAction} initial={{ name: user.name, phone: user.phone ?? "", isDefault: count === 0 }} submitLabel="Save address" cancelHref="/account/addresses" />
    </div>
  );
}
