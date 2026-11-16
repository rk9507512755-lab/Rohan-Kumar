import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ActionButton, ActionForm, Submit } from "../../../../_components/forms";
import { Check, Section, SelectField, TextArea, TextField } from "../../../../_components/fields";
import ImageInput from "../../../../_components/ImageInput";
import { PageHeader } from "../../../../_components/ui";
import { deleteBanner, saveBanner } from "../../actions";

export const metadata: Metadata = { title: "Banner" };

export default async function BannerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const b = id === "new" ? null : await db.banner.findUnique({ where: { id } });
  if (id !== "new" && !b) notFound();
  return (
    <>
      <PageHeader
        title={b ? b.title : "New banner"}
        back={{ href: "/admin/content/banners", label: "Banners" }}
        actions={
          b && (
            <ActionButton action={deleteBanner.bind(null, b.id)} confirm="Delete this banner?" className="admin-danger px-2">
              Delete
            </ActionButton>
          )
        }
      />
      <ActionForm action={saveBanner.bind(null, b?.id ?? null)} className="max-w-4xl space-y-4">
        <Section title="Text">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              name="placement"
              label="Placement"
              defaultValue={b?.placement ?? "hero"}
              options={[
                { value: "hero", label: "Hero carousel (top of home page)" },
                { value: "featured", label: "Featured banner" },
              ]}
            />
            <TextField name="eyebrow" label="Eyebrow" defaultValue={b?.eyebrow} placeholder="The Festive Edit" />
            <TextField name="title" label="Title" required defaultValue={b?.title} className="sm:col-span-2" />
            <TextArea name="subtitle" label="Subtitle" defaultValue={b?.subtitle} rows={2} className="sm:col-span-2" />
          </div>
        </Section>
        <Section title="Buttons" description="Leave a button's label empty to hide it.">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="ctaLabel" label="Button 1 label" defaultValue={b?.ctaLabel} placeholder="Shop now" />
            <TextField name="ctaHref" label="Button 1 link" defaultValue={b?.ctaHref} placeholder="/collections/sarees" />
            <TextField name="cta2Label" label="Button 2 label" defaultValue={b?.cta2Label} />
            <TextField name="cta2Href" label="Button 2 link" defaultValue={b?.cta2Href} />
          </div>
        </Section>
        <Section title="Images" description="Desktop: wide landscape (about 1920 × 900). Mobile: portrait (about 900 × 1200); falls back to desktop.">
          <div className="grid gap-6 md:grid-cols-2">
            <ImageInput name="desktopImage" label="Desktop image" current={b?.desktopImage} required />
            <ImageInput name="mobileImage" label="Mobile image" current={b?.mobileImage} />
          </div>
        </Section>
        <Section title="Display">
          <div className="flex flex-wrap items-end gap-6">
            <TextField name="sortOrder" label="Sort order" inputMode="numeric" defaultValue={b?.sortOrder ?? 0} className="w-32" />
            <div className="pb-3">
              <Check name="active" label="Active" defaultChecked={b?.active ?? true} />
            </div>
          </div>
        </Section>
        <Submit>{b ? "Save banner" : "Create banner"}</Submit>
      </ActionForm>
    </>
  );
}
