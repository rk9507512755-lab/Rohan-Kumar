/** Re-applies product and page copy from the seed files to an existing database without touching stock, orders or images. */
import { PrismaClient } from "@prisma/client";
import { PRODUCTS } from "./catalog-data";
import { seedCombos } from "./combos";

const slug = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

(async () => {
  const db = new PrismaClient();
  let n = 0;
  for (const p of PRODUCTS) {
    const r = await db.product.updateMany({ where: { slug: slug(p.name) }, data: { description: p.description, shortDescription: p.short, metaDescription: `${p.short} Shop ${p.name} in ${p.fabric} at REWAAS. Free shipping above ₹1,999, easy 7-day exchanges.` } });
    n += r.count;
  }
  await seedCombos(db);
  const fix: [string, string, string][] = [
    ["about", "- Fair wages and long-term partnerships with artisan clusters\n- Silk Mark certified silks and natural dyes wherever possible\n", "- Long-term partnerships with artisan clusters\n"],
    ["shipping-policy", "We ship to over 26,000 PIN codes across India through trusted courier partners.", "We ship across India through trusted courier partners."],
  ];
  for (const [s, a, b] of fix) {
    const page = await db.page.findUnique({ where: { slug: s } });
    if (page && page.body.includes(a)) await db.page.update({ where: { slug: s }, data: { body: page.body.replace(a, b) } });
  }
  console.log(`Copy refreshed for ${n} products, combos and pages.`);
  await db.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
