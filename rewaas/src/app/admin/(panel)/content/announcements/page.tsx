import type { Metadata } from "next";
import type { Announcement } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ActionButton, ActionForm, Submit } from "../../../_components/forms";
import { Section } from "../../../_components/fields";
import { PageHeader } from "../../../_components/ui";
import { deleteAnnouncement, saveAnnouncement } from "../actions";

export const metadata: Metadata = { title: "Announcements" };

function Row({ a }: { a?: Announcement }) {
  return (
    <ActionForm action={saveAnnouncement.bind(null, a?.id ?? null)} resetOnSuccess={!a} className="grid gap-2 border-b border-ink-200/60 py-3 md:grid-cols-[2fr_1.2fr_80px_auto_auto] md:items-center">
      <input name="text" defaultValue={a?.text ?? ""} placeholder="Free shipping on orders above ₹1,999" aria-label="Text" className="field !py-2" />
      <input name="href" defaultValue={a?.href ?? ""} placeholder="Link (optional)" aria-label="Link" className="field !py-2" />
      <input name="sortOrder" inputMode="numeric" defaultValue={a?.sortOrder ?? 0} aria-label="Sort order" className="field !py-2" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={a?.active ?? true} className="h-4 w-4 accent-wine" /> Active
      </label>
      <div className="flex items-center gap-3">
        <Submit className="!px-3">{a ? "Save" : "Add"}</Submit>
        {a && (
          <ActionButton action={deleteAnnouncement.bind(null, a.id)} confirm="Delete this announcement?" className="admin-danger">
            Delete
          </ActionButton>
        )}
      </div>
    </ActionForm>
  );
}

export default async function AnnouncementsPage() {
  await requireAdmin();
  const list = await db.announcement.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <>
      <PageHeader title="Announcements" description="Short messages that rotate in the bar above the site header." />
      <Section title={`Messages (${list.length})`}>
        <div className="hidden gap-2 border-b border-ink-200 pb-2 text-[11px] uppercase tracking-[0.1em] text-ink-400 md:grid md:grid-cols-[2fr_1.2fr_80px_auto_auto]">
          <span>Text</span>
          <span>Link</span>
          <span>Sort</span>
          <span />
          <span />
        </div>
        {list.map((a) => (
          <Row key={a.id} a={a} />
        ))}
        <p className="mt-5 text-xs uppercase tracking-[0.12em] text-ink-400">Add an announcement</p>
        <Row />
      </Section>
    </>
  );
}
