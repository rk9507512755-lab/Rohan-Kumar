import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ActionButton, ActionForm, Submit } from "../../../../_components/forms";
import { Check, Section, SelectField, TextArea, TextField } from "../../../../_components/fields";
import ImageInput from "../../../../_components/ImageInput";
import { PageHeader } from "../../../../_components/ui";
import { deleteTestimonial, saveTestimonial } from "../../actions";

export const metadata: Metadata = { title: "Testimonial" };

export default async function TestimonialPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const t = id === "new" ? null : await db.testimonial.findUnique({ where: { id } });
  if (id !== "new" && !t) notFound();
  return (
    <>
      <PageHeader
        title={t ? t.name : "New testimonial"}
        back={{ href: "/admin/content/testimonials", label: "Testimonials" }}
        actions={
          t && (
            <ActionButton action={deleteTestimonial.bind(null, t.id)} confirm="Delete this testimonial?" className="admin-danger px-2">
              Delete
            </ActionButton>
          )
        }
      />
      <ActionForm action={saveTestimonial.bind(null, t?.id ?? null)} className="max-w-3xl space-y-4">
        <Section title="Testimonial">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="name" label="Customer name" required defaultValue={t?.name} />
            <TextField name="city" label="City" defaultValue={t?.city} />
            <TextField name="productName" label="Product name" required defaultValue={t?.productName} />
            <TextField name="productSlug" label="Product slug" defaultValue={t?.productSlug} hint="Optional — links the testimonial to the product page." mono />
            <SelectField name="rating" label="Rating" defaultValue={String(t?.rating ?? 5)} options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${"★".repeat(n)} (${n})` }))} />
            <TextField name="sortOrder" label="Sort order" inputMode="numeric" defaultValue={t?.sortOrder ?? 0} />
            <TextArea name="text" label="What they said" required defaultValue={t?.text} rows={4} className="sm:col-span-2" />
            <div className="sm:col-span-2">
              <ImageInput name="image" label="Photo" current={t?.image} />
            </div>
            <Check name="active" label="Show on site" defaultChecked={t?.active ?? true} />
          </div>
        </Section>
        <Submit>{t ? "Save" : "Create testimonial"}</Submit>
      </ActionForm>
    </>
  );
}
