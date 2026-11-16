"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { err, fail, fields, imageFrom, isUnique, msg, ok, zBool, zInt, zOpt, zSlug, zText, zUrlOrPath, type FormState } from "../../_lib/form";

const zHref = z
  .string()
  .trim()
  .min(1, "Link is required")
  .max(500)
  .refine((v) => v.startsWith("/") || /^https?:\/\//i.test(v) || v.startsWith("#"), "Use a site path like /collections/sarees or a full https:// URL");

function refresh(section: string) {
  revalidatePath(`/admin/content/${section}`, "layout");
  revalidatePath("/", "layout");
}

// ---------- Banners ----------
const bannerSchema = z
  .object({
    placement: z.enum(["hero", "featured"]),
    eyebrow: zOpt(80),
    title: zText("Title", 140),
    subtitle: zOpt(300),
    ctaLabel: zOpt(40),
    ctaHref: zUrlOrPath,
    cta2Label: zOpt(40),
    cta2Href: zUrlOrPath,
    sortOrder: zInt("Sort order", -1000, 100000),
    active: zBool,
  })
  .refine((d) => !d.ctaLabel || d.ctaHref, { path: ["ctaHref"], message: "Add a link for the first button" })
  .refine((d) => !d.cta2Label || d.cta2Href, { path: ["cta2Href"], message: "Add a link for the second button" });

export async function saveBanner(id: string | null, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = bannerSchema.safeParse(fields(fd));
  if (!parsed.success) return fail(parsed.error);
  let desktopImage: string | null, mobileImage: string | null;
  try {
    desktopImage = await imageFrom(fd, "desktopImage");
    mobileImage = await imageFrom(fd, "mobileImage");
  } catch (e) {
    return err(msg(e));
  }
  if (!desktopImage) return err("Please fix the highlighted fields.", { desktopImage: "A desktop image is required" });
  const data = { ...parsed.data, desktopImage, mobileImage };
  let newId = id;
  if (id) await db.banner.update({ where: { id }, data });
  else newId = (await db.banner.create({ data })).id;
  refresh("banners");
  if (!id) redirect(`/admin/content/banners/${newId}`);
  return ok("Banner saved.");
}

export async function deleteBanner(id: string, _prev: FormState, _fd: FormData): Promise<FormState> {
  await requireAdmin();
  await db.banner.delete({ where: { id } }).catch(() => null);
  refresh("banners");
  redirect("/admin/content/banners");
}

// ---------- Announcements ----------
const annSchema = z.object({ text: zText("Text", 200), href: zUrlOrPath, sortOrder: zInt("Sort order", -1000, 100000), active: zBool });

export async function saveAnnouncement(id: string | null, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = annSchema.safeParse(fields(fd));
  if (!parsed.success) return fail(parsed.error, Object.values(fail(parsed.error)?.errors ?? {})[0]);
  if (id) await db.announcement.update({ where: { id }, data: parsed.data });
  else await db.announcement.create({ data: parsed.data });
  refresh("announcements");
  return ok(id ? "Saved." : "Announcement added.");
}

export async function deleteAnnouncement(id: string, _prev: FormState, _fd: FormData): Promise<FormState> {
  await requireAdmin();
  await db.announcement.delete({ where: { id } }).catch(() => null);
  refresh("announcements");
  return null;
}

// ---------- Testimonials ----------
const testiSchema = z.object({
  name: zText("Name", 80),
  city: zOpt(80),
  productName: zText("Product name", 140),
  productSlug: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v), "Use the product's slug, e.g. ruby-banarasi-saree")
    .transform((v) => v || null),
  rating: zInt("Rating", 1, 5),
  text: zText("Testimonial", 1000),
  sortOrder: zInt("Sort order", -1000, 100000),
  active: zBool,
});

export async function saveTestimonial(id: string | null, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = testiSchema.safeParse(fields(fd));
  if (!parsed.success) return fail(parsed.error);
  let image: string | null;
  try {
    image = await imageFrom(fd, "image");
  } catch (e) {
    return err(msg(e));
  }
  const data = { ...parsed.data, image };
  let newId = id;
  if (id) await db.testimonial.update({ where: { id }, data });
  else newId = (await db.testimonial.create({ data })).id;
  refresh("testimonials");
  if (!id) redirect(`/admin/content/testimonials/${newId}`);
  return ok("Testimonial saved.");
}

export async function deleteTestimonial(id: string, _prev: FormState, _fd: FormData): Promise<FormState> {
  await requireAdmin();
  await db.testimonial.delete({ where: { id } }).catch(() => null);
  refresh("testimonials");
  redirect("/admin/content/testimonials");
}

// ---------- CMS pages ----------
const pageSchema = z.object({ title: zText("Title", 140), slug: zSlug, body: zText("Content", 50000), metaDescription: zOpt(170) });

export async function savePage(id: string | null, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = pageSchema.safeParse(fields(fd));
  if (!parsed.success) return fail(parsed.error);
  let newId = id;
  try {
    if (id) await db.page.update({ where: { id }, data: parsed.data });
    else newId = (await db.page.create({ data: parsed.data })).id;
  } catch (e) {
    if (isUnique(e, "slug")) return err("Please fix the highlighted fields.", { slug: "Another page already uses this slug" });
    return err(msg(e));
  }
  refresh("pages");
  if (!id) redirect(`/admin/content/pages/${newId}`);
  return ok("Page saved.");
}

export async function deletePage(id: string, _prev: FormState, _fd: FormData): Promise<FormState> {
  await requireAdmin();
  await db.page.delete({ where: { id } }).catch(() => null);
  refresh("pages");
  redirect("/admin/content/pages");
}

// ---------- Navigation menu ----------
const menuSchema = z.object({ label: zText("Label", 60), href: zHref, sortOrder: zInt("Sort order", -1000, 100000), active: zBool });

export async function saveMenuItem(id: string | null, parentId: string | null, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = menuSchema.safeParse(fields(fd));
  if (!parsed.success) return fail(parsed.error, Object.values(fail(parsed.error)?.errors ?? {})[0]);
  let image: string | null = null;
  if (!parentId) {
    try {
      image = await imageFrom(fd, "image");
    } catch (e) {
      return err(msg(e));
    }
  }
  if (id) await db.menuItem.update({ where: { id }, data: { ...parsed.data, ...(!parentId && { image }) } });
  else await db.menuItem.create({ data: { ...parsed.data, parentId, image } });
  refresh("navigation");
  return ok(id ? "Saved." : "Link added.");
}

export async function moveMenuItem(id: string, dir: "up" | "down", _prev: FormState, _fd: FormData): Promise<FormState> {
  await requireAdmin();
  const item = await db.menuItem.findUnique({ where: { id } });
  if (!item) return null;
  const siblings = await db.menuItem.findMany({ where: { parentId: item.parentId }, orderBy: [{ sortOrder: "asc" }, { label: "asc" }] });
  const i = siblings.findIndex((s) => s.id === id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= siblings.length) return null;
  [siblings[i], siblings[j]] = [siblings[j], siblings[i]];
  await db.$transaction(siblings.map((s, idx) => db.menuItem.update({ where: { id: s.id }, data: { sortOrder: idx } })));
  refresh("navigation");
  return null;
}

export async function deleteMenuItem(id: string, _prev: FormState, _fd: FormData): Promise<FormState> {
  await requireAdmin();
  await db.menuItem.delete({ where: { id } }).catch(() => null);
  refresh("navigation");
  return null;
}
