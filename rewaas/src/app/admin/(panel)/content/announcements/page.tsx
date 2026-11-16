import type { Metadata } from "next";
import type { Announcement } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ActionButton, ActionForm, Submit } from "../../../_components/forms";
import { Section } from "../../../_components/fields";
import { PageHeader } from "../../../_components/ui";
import { deleteAnnouncement, saveAnnouncement } from "../actions";

export const metadata: Metadata = { title: "Announcements" };

const COLS = "grid flex-1 gap-2 md:grid-cols-[2fr_1.2fr_72px_90px_64px] md:items-center";

function Row({ a }: { a?: Announcement }) {
  return (
    <div className="flex flex-col gap-2 border-b border-ink-200/60 py-3 md:flex-row md:items-center md:gap-3">
    <ActionForm action={saveAnnouncement.bind(null, a?.id ?? null)} resetOnSuccess={!a} className={COLS}>
      <input name="text" defaultValue={a?.text ?? ""} placeholder="Free shipping on orders above ₹1,999" aria-label="Text" className="field !py-2" />
      <input name="href" defaultValue={a?.href ?? ""} placeholder="Link (optional)" aria-label="Link" className="field !py-2" />
      <input name="sortOrder" inputMode="numeric" defaultValue={a?.sortOrder ?? 0} aria-label="Sort order" className="field !py-2" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={a?.active ?? true} className="h-4 w-4 accent-wine" /> Active
      </label>
      <Submit className="!px-3">{a ? "Save" : "Add"}</Submit>
    </ActionForm>
      <div className="w-14 shrink-0">
        {a && (
          <ActionButton action={deleteAnnouncement.bind(null, a.id)} confirm="Delete this announcement?" className="admin-danger">
            Delete
          </ActionButton>
        )}
      </div>
    </div>
  );
}

export default async function AnnouncementsPage() {
  await requireAdmin();
  const list = await db.announcement.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <>
      <PageHeader title="Announcements" description="Short messages that rotate in the bar above the site header." />
      <Section title={`Messages (${list.length})`}>
        <div className="hidden gap-3 border-b border-ink-200 pb-2 text-[11px] uppercase tracking-[0.1em] text-ink-400 md:flex">
          <div className={COLS}>
            <span>Text</span>
            <span>Link</span>
            <span>Sort</span>
            <span />
            <span />
          </div>
          <span className="w-14 shrink-0" />
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
