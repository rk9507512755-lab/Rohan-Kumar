import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AddressForm from "@/components/account/AddressForm";
import PageTitle from "@/components/account/PageTitle";
import { updateAddressAction } from "@/app/actions/account";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Edit Address" };

export default async function EditAddressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser("/account/addresses");
  const a = await db.address.findFirst({ where: { id, userId: user.id } });
  if (!a) notFound();
  return (
    <div className="max-w-3xl">
      <PageTitle title="Edit address" />
      <AddressForm action={updateAddressAction.bind(null, a.id)} initial={a} submitLabel="Update address" cancelHref="/account/addresses" showDefaultToggle={!a.isDefault} />
    </div>
  );
}
