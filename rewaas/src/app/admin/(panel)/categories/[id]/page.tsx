import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { categoryTree } from "../../../_lib/categories";
import { SIZE_CHART_OPTIONS } from "../../../_lib/constants";
import { one, type SP } from "../../../_lib/query";
import { ActionButton, ActionForm, SlugFields, Submit } from "../../../_components/forms";
import { Check, Section, SelectField, TextArea, TextField } from "../../../_components/fields";
import ImageInput from "../../../_components/ImageInput";
import { PageHeader } from "../../../_components/ui";
import { deleteCategory, saveCategory } from "../actions";

export const metadata: Metadata = { title: "Category" };

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const isNew = id === "new";
  const [cat, tree] = await Promise.all([isNew ? null : db.category.findUnique({ where: { id }, include: { _count: { select: { products: true, children: true } } } }), categoryTree()]);
  if (!isNew && !cat) notFound();
  const parents = tree.filter((c) => c.id !== id);
  return (
    <>
      <PageHeader
        title={cat ? cat.name : "New category"}
        back={{ href: "/admin/categories", label: "Categories" }}
        description={cat ? `${cat._count.products} products · ${cat._count.children} sub-categories` : undefined}
        actions={
          cat && (
            <>
              <Link href={`/collections/${cat.slug}`} target="_blank" className="btn-outline btn-sm">
                View in store ↗
              </Link>
              {!cat._count.products && !cat._count.children && (
                <ActionButton action={deleteCategory.bind(null, cat.id)} confirm="Delete this category?" className="admin-danger px-2">
                  Delete
                </ActionButton>
              )}
            </>
          )
        }
      />
      {one(sp.saved) && <p className="mb-4 border-l-2 border-emerald-600 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Category created.</p>}
      <ActionForm action={saveCategory.bind(null, cat?.id ?? null)} className="max-w-3xl space-y-4">
        <Section title="Details">
          <div className="grid gap-4 sm:grid-cols-2">
            <SlugFields defaultName={cat?.name} defaultSlug={cat?.slug} />
            <SelectField name="parentId" label="Parent category" defaultValue={cat?.parentId ?? ""} options={[{ value: "", label: "— None (top level) —" }, ...parents.map((c) => ({ value: c.id, label: c.path }))]} />
            <SelectField name="sizeChart" label="Size chart" defaultValue={cat?.sizeChart ?? "NONE"} options={SIZE_CHART_OPTIONS} />
            <TextArea name="description" label="Description" defaultValue={cat?.description} rows={3} className="sm:col-span-2" />
            <TextField name="sortOrder" label="Sort order" type="number" defaultValue={cat?.sortOrder ?? 0} hint="Lower numbers appear first." />
            <div className="self-center">
              <Check name="showOnHome" label="Show on home page" defaultChecked={cat?.showOnHome ?? true} />
            </div>
          </div>
        </Section>
        <Section title="Images">
          <div className="grid gap-6 sm:grid-cols-2">
            <ImageInput name="image" label="Thumbnail image" current={cat?.image} />
            <ImageInput name="bannerImage" label="Banner image" current={cat?.bannerImage} />
          </div>
        </Section>
        <Section title="Search engine listing">
          <div className="grid gap-4">
            <TextField name="metaTitle" label="Meta title" defaultValue={cat?.metaTitle} />
            <TextArea name="metaDescription" label="Meta description" rows={2} defaultValue={cat?.metaDescription} />
          </div>
        </Section>
        <Submit>{cat ? "Save category" : "Create category"}</Submit>
      </ActionForm>
    </>
  );
}
