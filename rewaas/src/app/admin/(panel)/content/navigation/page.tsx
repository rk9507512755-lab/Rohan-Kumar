import type { Metadata } from "next";
import type { MenuItem } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ActionButton, ActionForm, Submit } from "../../../_components/forms";
import { Section } from "../../../_components/fields";
import { Empty, PageHeader, Thumb } from "../../../_components/ui";
import { deleteMenuItem, moveMenuItem, saveMenuItem } from "../actions";

export const metadata: Metadata = { title: "Navigation menu" };

function ItemForm({ item, parentId, top }: { item?: MenuItem; parentId: string | null; top: boolean }) {
  return (
    <ActionForm action={saveMenuItem.bind(null, item?.id ?? null, parentId)} resetOnSuccess={!item} className="flex flex-wrap items-center gap-2">
      <input name="label" defaultValue={item?.label ?? ""} placeholder="Label" aria-label="Label" className="field !w-40 !py-2" />
      <input name="href" defaultValue={item?.href ?? ""} placeholder="/collections/…" aria-label="Link" className="field !w-56 flex-1 !py-2" />
      <input type="hidden" name="sortOrder" value={item?.sortOrder ?? 999} />
      {top && (
        <span className="flex items-center gap-2">
          <input name="imageUrl" defaultValue={item?.image ?? ""} placeholder="Mega-menu image URL" aria-label="Mega-menu image URL" className="field !w-48 !py-2 text-xs" />
          <input name="imageFile" type="file" accept="image/jpeg,image/png,image/webp,image/avif" aria-label="Upload mega-menu image" className="w-48 text-xs file:mr-2 file:border-0 file:bg-ivory-200 file:px-2 file:py-1 file:text-xs" />
        </span>
      )}
      <label className="flex items-center gap-1.5 text-xs">
        <input type="checkbox" name="active" defaultChecked={item?.active ?? true} className="h-4 w-4 accent-wine" /> Active
      </label>
      <Submit className="!px-3">{item ? "Save" : "Add"}</Submit>
    </ActionForm>
  );
}

function Controls({ item, first, last, hasChildren }: { item: MenuItem; first: boolean; last: boolean; hasChildren?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <ActionButton action={moveMenuItem.bind(null, item.id, "up")} title="Move up" className={first ? "invisible" : ""}>
        ↑
      </ActionButton>
      <ActionButton action={moveMenuItem.bind(null, item.id, "down")} title="Move down" className={last ? "invisible" : ""}>
        ↓
      </ActionButton>
      <ActionButton action={deleteMenuItem.bind(null, item.id)} confirm={hasChildren ? `Delete "${item.label}" and all of its links?` : `Delete "${item.label}"?`} className="admin-danger">
        Delete
      </ActionButton>
    </div>
  );
}

export default async function NavigationPage() {
  await requireAdmin();
  const all = await db.menuItem.findMany({ orderBy: [{ sortOrder: "asc" }, { label: "asc" }] });
  const tops = all.filter((m) => !m.parentId);
  return (
    <>
      <PageHeader title="Navigation menu" description="Top-level menu items, each with an optional mega-menu image and a list of links." />
      <div className="space-y-4">
        {tops.length === 0 && <Empty>The menu is empty. Add the first item below.</Empty>}
        {tops.map((t, ti) => {
          const kids = all.filter((m) => m.parentId === t.id);
          return (
            <Section
              key={t.id}
              title={t.label}
              description={<span className="font-mono text-xs">{t.href}</span>}
              actions={<Controls item={t} first={ti === 0} last={ti === tops.length - 1} hasChildren={kids.length > 0} />}
            >
              <div className="flex items-start gap-4">
                {t.image && <Thumb src={t.image} size={64} />}
                <div className="min-w-0 flex-1">
                  <ItemForm item={t} parentId={null} top />
                </div>
              </div>
              <div className="mt-4 border-l-2 border-ivory-300 pl-4">
                <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-ink-400">Links ({kids.length})</p>
                <ul className="space-y-2">
                  {kids.map((k, ki) => (
                    <li key={k.id} className="flex flex-wrap items-start justify-between gap-2 border-b border-ink-200/50 pb-2">
                      <ItemForm item={k} parentId={t.id} top={false} />
                      <Controls item={k} first={ki === 0} last={ki === kids.length - 1} />
                    </li>
                  ))}
                </ul>
                <div className="mt-3">
                  <p className="mb-1 text-xs text-ink-400">Add a link under {t.label}</p>
                  <ItemForm parentId={t.id} top={false} />
                </div>
              </div>
            </Section>
          );
        })}
        <Section title="Add a top-level item">
          <ItemForm parentId={null} top />
        </Section>
      </div>
    </>
  );
}
