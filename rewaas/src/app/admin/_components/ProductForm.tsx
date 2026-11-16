import type { Product } from "@prisma/client";
import { ActionForm, FormNotice, SlugFields, Submit } from "./forms";
import { Check, MoneyField, Section, SelectField, TextArea, TextField } from "./fields";
import { COLLECTIONS, GST_OPTIONS, OCCASIONS, SIZE_CHART_OPTIONS } from "../_lib/constants";
import type { CatNode } from "../_lib/categories";
import type { FormAction } from "../_lib/types";
import { titleCase } from "@/lib/utils";

export default function ProductForm({ action, product, categories }: { action: FormAction; product?: Product | null; categories: CatNode[] }) {
  const p = product;
  const extraCollections = (p?.collections ?? []).filter((c) => !(COLLECTIONS as readonly string[]).includes(c)).join(", ");
  return (
    <ActionForm action={action} className="grid gap-4 lg:grid-cols-3" notice={false}>
      <div className="space-y-4 lg:col-span-2">
        <Section title="Basics">
          <div className="grid gap-4 sm:grid-cols-2">
            <SlugFields defaultName={p?.name} defaultSlug={p?.slug} />
            <TextArea name="shortDescription" label="Short description" rows={2} defaultValue={p?.shortDescription} className="sm:col-span-2" hint="One or two lines shown near the price." />
            <TextArea name="description" label="Full description" required rows={7} defaultValue={p?.description} className="sm:col-span-2" />
          </div>
        </Section>
        <Section title="Craft & care">
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField name="fabric" label="Fabric" defaultValue={p?.fabric} placeholder="Pure silk" />
            <TextField name="work" label="Work" defaultValue={p?.work} placeholder="Zari weaving" />
            <TextField name="washCare" label="Wash care" defaultValue={p?.washCare} placeholder="Dry clean only" />
          </div>
        </Section>
        <Section title="Pricing" description="Enter amounts in rupees. Prices are GST-inclusive.">
          <div className="grid gap-4 sm:grid-cols-3">
            <MoneyField name="price" label="Selling price" required defaultPaise={p?.price} />
            <MoneyField name="compareAtPrice" label="Compare-at (MRP)" defaultPaise={p?.compareAtPrice} hint="Optional, shown struck through." />
            <SelectField name="gstRate" label="GST rate" defaultValue={p?.gstRate == null ? "" : String(p.gstRate)} options={GST_OPTIONS} />
          </div>
        </Section>
        {!p && (
          <Section title="Images" description="You can add more, reorder and set alt text after creating the product.">
            <label className="field-label" htmlFor="f-images">
              Upload images
            </label>
            <input id="f-images" type="file" name="images" multiple accept="image/jpeg,image/png,image/webp,image/avif" className="block w-full text-sm file:mr-3 file:border-0 file:bg-wine file:px-4 file:py-2 file:text-xs file:uppercase file:tracking-wider file:text-ivory" />
            <p className="mt-1 text-xs text-ink-400">JPG, PNG, WebP or AVIF, up to 10 MB each.</p>
          </Section>
        )}
        <Section title="Search engine listing">
          <div className="grid gap-4">
            <TextField name="metaTitle" label="Meta title" defaultValue={p?.metaTitle} hint="Up to 70 characters. Defaults to the product name." />
            <TextArea name="metaDescription" label="Meta description" rows={2} defaultValue={p?.metaDescription} hint="Up to 170 characters." />
          </div>
        </Section>
      </div>

      <div className="space-y-4">
        <Section title="Status">
          <div className="space-y-4">
            <SelectField
              name="status"
              label="Visibility"
              defaultValue={p?.status ?? "DRAFT"}
              options={[
                { value: "ACTIVE", label: "Active — visible in store" },
                { value: "DRAFT", label: "Draft — hidden" },
                { value: "ARCHIVED", label: "Archived" },
              ]}
            />
            <div className="space-y-2">
              <Check name="isNew" label="New arrival" defaultChecked={p?.isNew} />
              <Check name="isBestseller" label="Bestseller" defaultChecked={p?.isBestseller} />
              <Check name="isFeatured" label="Featured" defaultChecked={p?.isFeatured} />
            </div>
          </div>
        </Section>
        <Section title="Organisation">
          <div className="space-y-4">
            <SelectField name="categoryId" label="Category" required defaultValue={p?.categoryId ?? ""} options={[{ value: "", label: "Select a category…" }, ...categories.map((c) => ({ value: c.id, label: c.path }))]} />
            <fieldset>
              <legend className="field-label">Occasions</legend>
              <div className="grid grid-cols-2 gap-2">
                {OCCASIONS.map((o) => (
                  <Check key={o} name="occasions" value={o} label={titleCase(o)} defaultChecked={p?.occasions.includes(o)} />
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="field-label">Collections</legend>
              <div className="space-y-2">
                {COLLECTIONS.map((o) => (
                  <Check key={o} name="collections" value={o} label={titleCase(o)} defaultChecked={p?.collections.includes(o)} />
                ))}
              </div>
              <TextField name="collectionsExtra" label="Other collections" defaultValue={extraCollections} className="mt-3" hint="Comma separated, e.g. diwali-edit, summer" />
            </fieldset>
            <TextField name="tags" label="Search tags" defaultValue={p?.tags.join(", ")} hint="Comma separated." />
            <SelectField name="sizeChart" label="Size chart" defaultValue={p?.sizeChart ?? "NONE"} options={SIZE_CHART_OPTIONS} />
            <TextField name="videoUrl" label="Video URL" defaultValue={p?.videoUrl} placeholder="https://… or /api/media/…" />
          </div>
        </Section>
        <div className="sticky bottom-4 bg-ivory-50/90 pt-1">
          <FormNotice className="mb-3 mt-0" />
          <Submit className="w-full shadow-lg">{p ? "Save product" : "Create product"}</Submit>
        </div>
      </div>
    </ActionForm>
  );
}
