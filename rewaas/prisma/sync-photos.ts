/**
 * Product photo folders → product images.
 *
 * Put photos in  public/products/<product-slug>/  (jpg, jpeg, png, webp). Files are used in name order
 * (1.jpg, 2.jpg, … — the first one is the main photo). Run `npm run photos:sync`, or just redeploy:
 * the Vercel build runs this automatically.
 *
 * For each product that has a folder: the folder photos become its first images, demo photos
 * (/photos/…, /images/…) are removed, and photos uploaded through the admin panel are kept after them.
 */
import { existsSync, readdirSync, statSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const ROOT = path.join(process.cwd(), "public", "products");
const OK = /\.(jpe?g|png|webp|avif)$/i;
const natural = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

(async () => {
  if (!existsSync(ROOT)) { console.log("No public/products folder — nothing to sync."); return; }
  const db = new PrismaClient();
  const folders = readdirSync(ROOT).filter((d) => statSync(path.join(ROOT, d)).isDirectory());
  let updated = 0;
  const unknown: string[] = [];
  for (const slug of folders) {
    const files = readdirSync(path.join(ROOT, slug)).filter((f) => OK.test(f)).sort(natural.compare);
    if (!files.length) continue;
    const product = await db.product.findUnique({ where: { slug }, include: { images: { orderBy: { sortOrder: "asc" } } } });
    if (!product) { unknown.push(slug); continue; }
    const wanted = files.map((f) => `/products/${slug}/${encodeURIComponent(f)}`);
    const current = product.images.map((i) => i.url);
    if (wanted.every((u, i) => current[i] === u) && !current.some((u) => u.startsWith("/photos/") || u.startsWith("/images/"))) continue;
    const kept = product.images.filter((i) => !i.url.startsWith("/photos/") && !i.url.startsWith("/images/") && !i.url.startsWith(`/products/${slug}/`));
    await db.$transaction([
      db.productImage.deleteMany({ where: { productId: product.id, id: { notIn: kept.map((k) => k.id) } } }),
      ...wanted.map((url, i) => db.productImage.create({ data: { productId: product.id, url, alt: i === 0 ? product.name : `${product.name} — photo ${i + 1}`, sortOrder: i } })),
      ...kept.map((k, i) => db.productImage.update({ where: { id: k.id }, data: { sortOrder: wanted.length + i } })),
    ]);
    updated++;
    console.log(`✓ ${product.name}: ${files.length} photo(s)`);
  }
  console.log(`Photo sync done — ${updated} product(s) updated.`);
  if (unknown.length) console.log(`⚠ No product found for folder(s): ${unknown.join(", ")} — check the folder name against PRODUCT-PHOTO-FOLDERS.md`);
  await db.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
