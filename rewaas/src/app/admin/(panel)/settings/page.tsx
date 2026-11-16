import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getSettings, num } from "@/lib/settings";
import { ActionForm, FormNotice, Submit } from "../../_components/forms";
import { MoneyField, Section, TextArea, TextField } from "../../_components/fields";
import { PageHeader } from "../../_components/ui";
import { saveSettings } from "./actions";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireAdmin();
  const s = await getSettings();
  const pct = (name: keyof typeof s, label: string, hint?: string) => <TextField name={name} label={label} defaultValue={s[name]} inputMode="numeric" hint={hint} />;
  return (
    <>
      <PageHeader title="Settings" description="Store details, shipping fees and tax rules used across the site and on invoices." />
      <ActionForm action={saveSettings} className="max-w-4xl space-y-4" notice={false}>
        <Section title="Store">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="storeName" label="Store name" required defaultValue={s.storeName} />
            <TextField name="tagline" label="Tagline" defaultValue={s.tagline} />
            <TextField name="supportEmail" label="Support email" required type="email" defaultValue={s.supportEmail} />
            <TextField name="supportPhone" label="Support phone" required defaultValue={s.supportPhone} />
            <TextField name="whatsappNumber" label="WhatsApp number" required defaultValue={s.whatsappNumber} hint="Digits with country code, e.g. 919876543210" />
            <TextField name="gstin" label="GSTIN" required defaultValue={s.gstin} mono />
            <TextArea name="address" label="Registered address" required defaultValue={s.address} rows={2} className="sm:col-span-2" hint="Printed on tax invoices." />
          </div>
        </Section>
        <Section title="Shipping & fees" description="Amounts in rupees.">
          <div className="grid gap-4 sm:grid-cols-3">
            <MoneyField name="freeShippingThreshold" label="Free shipping from" required defaultPaise={num(s.freeShippingThreshold)} />
            <MoneyField name="shippingFee" label="Shipping fee" required defaultPaise={num(s.shippingFee)} hint="Below the free-shipping amount." />
            <MoneyField name="giftWrapFee" label="Gift wrap fee" required defaultPaise={num(s.giftWrapFee)} />
            <MoneyField name="codFee" label="Cash on delivery fee" required defaultPaise={num(s.codFee)} />
            <MoneyField name="codMaxOrder" label="COD maximum order" required defaultPaise={num(s.codMaxOrder)} hint="COD is hidden above this total." />
          </div>
        </Section>
        <Section title="GST" description="Prices are GST-inclusive. Apparel uses the low rate up to the threshold, the high rate above it.">
          <div className="grid gap-4 sm:grid-cols-4">
            <MoneyField name="apparelGstThreshold" label="Apparel threshold" required defaultPaise={num(s.apparelGstThreshold)} />
            {pct("apparelGstLow", "Apparel low rate %")}
            {pct("apparelGstHigh", "Apparel high rate %")}
            {pct("hamperGst", "Hampers & gifts %")}
          </div>
        </Section>
        <Section title="Social">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="instagramHandle" label="Instagram handle" defaultValue={s.instagramHandle} placeholder="rewaas.official" />
            <TextField name="instagramUrl" label="Instagram URL" defaultValue={s.instagramUrl} />
            <TextField name="facebookUrl" label="Facebook URL" defaultValue={s.facebookUrl} />
            <TextField name="pinterestUrl" label="Pinterest URL" defaultValue={s.pinterestUrl} />
            <TextField name="youtubeUrl" label="YouTube URL" defaultValue={s.youtubeUrl} />
          </div>
        </Section>
        <div className="sticky bottom-0 -mx-4 border-t border-ink-200/70 bg-ivory-50/95 px-4 py-3 backdrop-blur sm:mx-0">
          <FormNotice className="mb-3 mt-0" />
          <Submit>Save settings</Submit>
        </div>
      </ActionForm>
    </>
  );
}
