import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ActionButton, ActionForm, SlugFields, Submit } from "../../../../_components/forms";
import { Section, TextArea } from "../../../../_components/fields";
import { PageHeader } from "../../../../_components/ui";
import { deletePage, savePage } from "../../actions";

export const metadata: Metadata = { title: "Page" };

const HELP = (
  <div className="mt-2 border border-ink-200/70 bg-ivory-100 p-3 leading-relaxed">
    <p className="mb-1 font-medium text-ink">Formatting</p>
    <ul className="grid gap-x-6 gap-y-0.5 font-mono text-[11px] sm:grid-cols-2">
      <li>## Heading</li>
      <li>### Small heading</li>
      <li>- List item (one per line)</li>
      <li>**bold text**</li>
      <li>[link text](/collections/sarees)</li>
      <li>Blank line = new paragraph</li>
    </ul>
    <p className="mt-1">Links must start with /, https://, mailto: or tel:. HTML is not allowed.</p>
  </div>
);

export default async function CmsPageEditor({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const p = id === "new" ? null : await db.page.findUnique({ where: { id } });
  if (id !== "new" && !p) notFound();
  return (
    <>
      <PageHeader
        title={p ? p.title : "New page"}
        back={{ href: "/admin/content/pages", label: "Pages" }}
        actions={
          p && (
            <ActionButton action={deletePage.bind(null, p.id)} confirm="Delete this page? Links to it will stop working." className="admin-danger px-2">
              Delete
            </ActionButton>
          )
        }
      />
      <ActionForm action={savePage.bind(null, p?.id ?? null)} className="max-w-4xl space-y-4">
        <Section title="Content">
          <div className="grid gap-4 sm:grid-cols-2">
            <SlugFields nameField="title" nameLabel="Title" defaultName={p?.title} defaultSlug={p?.slug} />
            <TextArea name="body" label="Body" required rows={18} mono defaultValue={p?.body} className="sm:col-span-2" hint={HELP} />
            <TextArea name="metaDescription" label="Meta description" rows={2} defaultValue={p?.metaDescription} className="sm:col-span-2" hint="Up to 170 characters, shown in search results." />
          </div>
        </Section>
        <Submit>{p ? "Save page" : "Create page"}</Submit>
      </ActionForm>
    </>
  );
}
