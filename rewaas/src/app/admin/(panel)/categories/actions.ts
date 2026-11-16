"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { err, fail, fields, imageFrom, isUnique, msg, ok, zBool, zInt, zOpt, zSlug, zText, type FormState } from "../../_lib/form";
import { SIZE_CHARTS } from "../../_lib/constants";

const schema = z.object({
  name: zText("Name", 100),
  slug: zSlug,
  parentId: z.string().optional().transform((v) => v || null),
  description: zOpt(2000),
  sizeChart: z.enum(SIZE_CHARTS),
  sortOrder: zInt("Sort order", -1000, 100000),
  showOnHome: zBool,
  metaTitle: zOpt(70),
  metaDescription: zOpt(170),
});

export async function saveCategory(id: string | null, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = schema.safeParse(fields(fd));
  if (!parsed.success) return fail(parsed.error);
  const d = parsed.data;
  if (id && d.parentId) {
    // prevent cycles: the new parent may not be this category or one of its descendants
    const all = await db.category.findMany({ select: { id: true, parentId: true } });
    let cur: string | null = d.parentId;
    while (cur) {
      if (cur === id) return err("Please fix the highlighted fields.", { parentId: "A category can't be placed inside itself or its own sub-category" });
      cur = all.find((c) => c.id === cur)?.parentId ?? null;
    }
  }
  let image: string | null, bannerImage: string | null;
  try {
    image = await imageFrom(fd, "image");
    bannerImage = await imageFrom(fd, "bannerImage");
  } catch (e) {
    return err(msg(e), { image: msg(e) });
  }
  let newId = id;
  try {
    if (id) await db.category.update({ where: { id }, data: { ...d, image, bannerImage } });
    else newId = (await db.category.create({ data: { ...d, image, bannerImage } })).id;
  } catch (e) {
    if (isUnique(e, "slug")) return err("Please fix the highlighted fields.", { slug: "Another category already uses this slug" });
    return err(msg(e));
  }
  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
  if (!id) redirect(`/admin/categories/${newId}?saved=1`);
  return ok("Category saved.");
}

export async function deleteCategory(id: string, _prev: FormState, _fd: FormData): Promise<FormState> {
  await requireAdmin();
  const cat = await db.category.findUnique({ where: { id }, include: { _count: { select: { products: true, children: true } } } });
  if (!cat) return err("Category not found.");
  if (cat._count.products || cat._count.children)
    return err(`Can't delete: it still has ${cat._count.products} product(s) and ${cat._count.children} sub-categor${cat._count.children === 1 ? "y" : "ies"}. Move or delete them first.`);
  await db.category.delete({ where: { id } });
  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
  redirect("/admin/categories");
}
