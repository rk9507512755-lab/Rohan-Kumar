import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { HAMPER_GROUPS } from "../../../../_lib/constants";
import { ActionButton, ActionForm, Submit } from "../../../../_components/forms";
import { Check, MoneyField, Section, TextArea, TextField } from "../../../../_components/fields";
import ImageInput from "../../../../_components/ImageInput";
import { PageHeader } from "../../../../_components/ui";
import { deleteGiftItem, saveGiftItem, type Kind } from "../../actions";

export const metadata: Metadata = { title: "Gift Studio" };

const LABEL: Record<Kind, string> = { box: "hamper box", component: "hamper item", packaging: "packaging option" };

type Item = { id: string; name: string; description: string; image: string | null; price: number; sortOrder: number; active: boolean; stock?: number; capacity?: number; dimensions?: string | null; group?: string; maxPerHamper?: number };

export default async function GiftItemPage({ params }: { params: Promise<{ kind: string; id: string }> }) {
  await requireAdmin();
  const { kind: k, id } = await params;
  if (!(k in LABEL)) notFound();
  const kind = k as Kind;
  const isNew = id === "new";
  let item: Item | null = null;
  if (!isNew) {
    item =
      kind === "box"
        ? await db.hamperBox.findUnique({ where: { id } })
        : kind === "component"
          ? await db.hamperComponent.findUnique({ where: { id } })
          : await db.packagingOption.findUnique({ where: { id } });
    if (!item) notFound();
  }
  const label = LABEL[kind];
  const lowStock = item?.stock != null && item.stock <= 10;

  return (
    <>
      <PageHeader
        title={item ? item.name : `New ${label}`}
        eyebrow={item ? label : undefined}
        back={{ href: "/admin/gift-studio", label: "Gift Studio" }}
        actions={
          item && (
            <ActionButton action={deleteGiftItem.bind(null, kind, item.id)} confirm={`Delete this ${label}? Past orders keep their snapshot. Consider hiding it instead.`} className="admin-danger px-2">
              Delete
            </ActionButton>
          )
        }
      />
      {lowStock && <p className="mb-4 border-l-2 border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-900">Low stock: only {item!.stock} left.</p>}
      <ActionForm action={saveGiftItem.bind(null, kind, item?.id ?? null)} className="max-w-3xl space-y-4">
        <Section title="Details">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="name" label="Name" required defaultValue={item?.name} className="sm:col-span-2" />
            <TextArea name="description" label="Description" required defaultValue={item?.description} rows={3} className="sm:col-span-2" />
            <MoneyField name="price" label="Price" required defaultPaise={item?.price ?? (kind === "packaging" ? 0 : null)} hint={kind === "packaging" ? "Enter 0 for free packaging." : undefined} />
            {kind === "component" && (
              <div>
                <label className="field-label" htmlFor="f-group">
                  Group *
                </label>
                <input id="f-group" name="group" list="groups" defaultValue={item?.group ?? ""} className="field" />
                <datalist id="groups">
                  {HAMPER_GROUPS.map((g) => (
                    <option key={g} value={g} />
                  ))}
                </datalist>
              </div>
            )}
            {kind === "box" && (
              <>
                <TextField name="capacity" label="Capacity (items)" required inputMode="numeric" defaultValue={item?.capacity ?? 6} />
                <TextField name="dimensions" label="Dimensions" defaultValue={item?.dimensions} placeholder="30 × 22 × 10 cm" />
              </>
            )}
            {kind === "component" && <TextField name="maxPerHamper" label="Max per hamper" required inputMode="numeric" defaultValue={item?.maxPerHamper ?? 3} />}
            {kind !== "packaging" && <TextField name="stock" label="Stock" required inputMode="numeric" defaultValue={item?.stock ?? 0} hint="Warning shown at 10 or fewer." />}
            <TextField name="sortOrder" label="Sort order" inputMode="numeric" defaultValue={item?.sortOrder ?? 0} />
            <div className="self-center sm:col-span-2">
              <Check name="active" label="Active (available in Gift Studio)" defaultChecked={item?.active ?? true} />
            </div>
          </div>
        </Section>
        <Section title="Image">
          <ImageInput name="image" label="Image" current={item?.image} required={kind !== "packaging"} />
        </Section>
        <Submit>{item ? "Save" : `Create ${label}`}</Submit>
      </ActionForm>
    </>
  );
}
