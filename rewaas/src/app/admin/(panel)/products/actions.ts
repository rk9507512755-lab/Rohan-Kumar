"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveUpload } from "@/lib/storage";
import { err, fail, fields, files, isUnique, msg, ok, zBool, zOpt, zOptRupees, zRupees, zSlug, zText, zUrlOrPath, type FormState } from "../../_lib/form";
import { OCCASIONS, SIZE_CHARTS } from "../../_lib/constants";

const csv = (v: unknown) =>
  String(v ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase().replace(/\s+/g, "-"))
    .filter(Boolean);

const productSchema = z
  .object({
    name: zText("Name", 160),
    slug: zSlug,
    shortDescription: zOpt(300),
    description: zText("Full description", 10000),
    fabric: zOpt(120),
    work: zOpt(160),
    washCare: zOpt(300),
    price: zRupees("Price", { min: 100 }),
    compareAtPrice: zOptRupees("Compare-at price"),
    categoryId: z.string().min(1, "Choose a category"),
    occasions: z.array(z.enum(OCCASIONS)),
    collections: z.array(z.string()),
    collectionsExtra: z.string().optional(),
    tags: z.string().optional(),
    isNew: zBool,
    isBestseller: zBool,
    isFeatured: zBool,
    status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]),
    sizeChart: z.enum(SIZE_CHARTS),
    videoUrl: zUrlOrPath,
    gstRate: z.enum(["", "0", "5", "12", "18", "28"]).transform((v) => (v === "" ? null : Number(v))),
    metaTitle: zOpt(70),
    metaDescription: zOpt(170),
  })
  .refine((d) => d.compareAtPrice == null || d.compareAtPrice > d.price, { path: ["compareAtPrice"], message: "Compare-at price should be higher than the selling price (or leave it blank)" });

export async function saveProduct(id: string | null, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = productSchema.safeParse(fields(fd, ["occasions", "collections"]));
  if (!parsed.success) return fail(parsed.error);
  const { collectionsExtra, tags, ...d } = parsed.data;
  const category = await db.category.findUnique({ where: { id: d.categoryId } });
  if (!category) return err("Please fix the highlighted fields.", { categoryId: "Choose a valid category" });
  const data = {
    ...d,
    collections: Array.from(new Set([...d.collections, ...csv(collectionsExtra)])),
    tags: Array.from(new Set(csv(tags))),
  };
  let productId = id;
  try {
    if (id) {
      await db.product.update({ where: { id }, data });
    } else {
      const created = await db.product.create({ data });
      productId = created.id;
      const imgs = files(fd, "images");
      for (const [i, f] of imgs.entries()) {
        const url = await saveUpload(f);
        await db.productImage.create({ data: { productId, url, alt: d.name, sortOrder: i } });
      }
    }
  } catch (e) {
    if (isUnique(e, "slug")) return err("Please fix the highlighted fields.", { slug: "Another product already uses this slug" });
    return err(msg(e));
  }
  revalidatePath("/admin/products");
  revalidatePath("/", "layout");
  if (!id) redirect(`/admin/products/${productId}?created=1`);
  return ok("Product saved.");
}

export async function deleteProduct(id: string, _prev: FormState, _fd: FormData): Promise<FormState> {
  await requireAdmin();
  const orders = await db.orderItem.count({ where: { productId: id } });
  if (orders > 0) {
    await db.product.update({ where: { id }, data: { status: "ARCHIVED" } });
    revalidatePath("/admin/products");
    revalidatePath("/", "layout");
    redirect("/admin/products?archived=1");
  }
  await db.product.delete({ where: { id } }).catch(() => null);
  revalidatePath("/admin/products");
  revalidatePath("/", "layout");
  redirect("/admin/products?deleted=1");
}

// ---------- Images ----------

export async function uploadImages(productId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const list = files(fd, "images");
  const url = String(fd.get("url") ?? "").trim();
  if (!list.length && !url) return err("Choose one or more image files, or paste an image URL.");
  if (url && !(url.startsWith("/") || /^https?:\/\//i.test(url))) return err("Image URL must start with https:// or /");
  const product = await db.product.findUnique({ where: { id: productId }, select: { name: true, _count: { select: { images: true } } } });
  if (!product) return err("Product not found.");
  const alt = String(fd.get("alt") ?? "").trim() || product.name;
  let order = (await db.productImage.aggregate({ where: { productId }, _max: { sortOrder: true } }))._max.sortOrder ?? -1;
  try {
    for (const f of list) {
      const saved = await saveUpload(f);
      await db.productImage.create({ data: { productId, url: saved, alt, sortOrder: ++order } });
    }
    if (url) await db.productImage.create({ data: { productId, url, alt, sortOrder: ++order } });
  } catch (e) {
    return err(msg(e));
  }
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/", "layout");
  const n = list.length + (url ? 1 : 0);
  return ok(`${n} image${n === 1 ? "" : "s"} added.`);
}

export async function updateImage(imageId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = z.object({ alt: zOpt(200), colour: zOpt(60) }).safeParse(fields(fd));
  if (!parsed.success) return fail(parsed.error);
  const img = await db.productImage.update({ where: { id: imageId }, data: parsed.data });
  revalidatePath(`/admin/products/${img.productId}`);
  return ok("Saved.");
}

export async function moveImage(imageId: string, dir: "up" | "down", _prev: FormState, _fd: FormData): Promise<FormState> {
  await requireAdmin();
  const img = await db.productImage.findUnique({ where: { id: imageId } });
  if (!img) return err("Image not found.");
  const all = await db.productImage.findMany({ where: { productId: img.productId }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
  const i = all.findIndex((x) => x.id === imageId);
  const j = dir === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= all.length) return null;
  [all[i], all[j]] = [all[j], all[i]];
  await db.$transaction(all.map((x, idx) => db.productImage.update({ where: { id: x.id }, data: { sortOrder: idx } })));
  revalidatePath(`/admin/products/${img.productId}`);
  revalidatePath("/", "layout");
  return null;
}

export async function deleteImage(imageId: string, _prev: FormState, _fd: FormData): Promise<FormState> {
  await requireAdmin();
  const img = await db.productImage.delete({ where: { id: imageId } }).catch(() => null);
  if (img) {
    revalidatePath(`/admin/products/${img.productId}`);
    revalidatePath("/", "layout");
  }
  return null;
}

// ---------- Variants ----------

const variantSchema = z.object({
  size: zText("Size", 40),
  colour: zText("Colour", 60),
  colourHex: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #a3423c"),
  sku: z.string().trim().toUpperCase().min(2, "SKU is required").max(60).regex(/^[A-Z0-9][A-Z0-9_-]*$/, "Letters, numbers, - and _ only"),
  stock: z.preprocess((v) => (v === "" ? undefined : Number(v)), z.number({ required_error: "Stock is required", invalid_type_error: "Stock must be a number" }).int("Whole number").min(0, "Can't be negative").max(100000)),
  price: zOptRupees("Price override"),
});

export async function saveVariant(productId: string, variantId: string | null, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = variantSchema.safeParse(fields(fd));
  if (!parsed.success) return fail(parsed.error, Object.values(fail(parsed.error)?.errors ?? {})[0] ?? "Check the variant fields.");
  try {
    if (variantId) await db.variant.update({ where: { id: variantId }, data: parsed.data });
    else await db.variant.create({ data: { ...parsed.data, productId } });
  } catch (e) {
    if (isUnique(e, "sku")) return err(`SKU ${parsed.data.sku} is already used by another variant.`, { sku: "SKU already in use" });
    return err(msg(e));
  }
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/products");
  revalidatePath("/", "layout");
  return ok(variantId ? "Variant saved." : "Variant added.");
}

export async function deleteVariant(variantId: string, _prev: FormState, _fd: FormData): Promise<FormState> {
  await requireAdmin();
  const v = await db.variant.delete({ where: { id: variantId } }).catch(() => null);
  if (v) {
    revalidatePath(`/admin/products/${v.productId}`);
    revalidatePath("/", "layout");
  }
  return null;
}
