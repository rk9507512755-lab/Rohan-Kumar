import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { one, type SP } from "../../../_lib/query";
import { ActionButton, ActionForm, Submit } from "../../../_components/forms";
import { Check, MoneyField, Section, SelectField, TextField } from "../../../_components/fields";
import { PageHeader } from "../../../_components/ui";
import { deleteCoupon, saveCoupon } from "../actions";

export const metadata: Metadata = { title: "Coupon" };

const ymd = (d?: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : "");

export default async function CouponPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const c = id === "new" ? null : await db.coupon.findUnique({ where: { id } });
  if (id !== "new" && !c) notFound();
  const value = c ? (c.type === "PERCENT" ? String(c.value) : String(c.value / 100)) : "";
  return (
    <>
      <PageHeader
        title={c ? c.code : "New coupon"}
        back={{ href: "/admin/coupons", label: "Coupons" }}
        description={c ? `Used ${c.usedCount} time${c.usedCount === 1 ? "" : "s"}${c.usageLimit != null ? ` of ${c.usageLimit}` : ""}` : undefined}
        actions={
          c && (
            <ActionButton action={deleteCoupon.bind(null, c.id)} confirm={`Delete coupon ${c.code}? Customers will no longer be able to use it.`} className="admin-danger px-2">
              Delete
            </ActionButton>
          )
        }
      />
      {one(sp.saved) && <p className="mb-4 border-l-2 border-emerald-600 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Coupon created.</p>}
      <ActionForm action={saveCoupon.bind(null, c?.id ?? null)} className="max-w-3xl space-y-4">
        <Section title="Discount">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="code" label="Code" required defaultValue={c?.code} placeholder="FESTIVE10" mono hint="Saved in capitals." />
            <TextField name="description" label="Description" defaultValue={c?.description} placeholder="10% off festive orders" />
            <SelectField
              name="type"
              label="Type"
              defaultValue={c?.type ?? "PERCENT"}
              options={[
                { value: "PERCENT", label: "Percentage off" },
                { value: "FLAT", label: "Flat amount off (₹)" },
              ]}
            />
            <TextField name="value" label="Value" required inputMode="decimal" defaultValue={value} hint="Percent (e.g. 10) or rupees (e.g. 500), depending on type." />
            <MoneyField name="minSubtotal" label="Minimum order" defaultPaise={c?.minSubtotal || null} hint="Optional." />
            <MoneyField name="maxDiscount" label="Maximum discount" defaultPaise={c?.maxDiscount} hint="Caps percentage coupons. Ignored for flat." />
          </div>
        </Section>
        <Section title="Limits">
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField name="startsAt" label="Starts" type="date" defaultValue={ymd(c?.startsAt)} />
            <TextField name="endsAt" label="Ends (inclusive)" type="date" defaultValue={ymd(c?.endsAt)} />
            <TextField name="usageLimit" label="Usage limit" inputMode="numeric" defaultValue={c?.usageLimit} hint="Blank = unlimited." />
            <div>
              <p className="field-label">Times used</p>
              <p className="py-2.5 text-sm">{c?.usedCount ?? 0}</p>
            </div>
            <div className="self-center sm:col-span-2">
              <Check name="active" label="Active" defaultChecked={c?.active ?? true} />
            </div>
          </div>
        </Section>
        <Submit>{c ? "Save coupon" : "Create coupon"}</Submit>
      </ActionForm>
    </>
  );
}
