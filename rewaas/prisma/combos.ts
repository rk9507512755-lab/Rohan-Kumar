/**
 * Gift Combos — ready-to-gift boxes that pair a saree or suit with jewellery and treats,
 * plus saree / suit / jewellery items for the Create Your Own Hamper builder.
 * Idempotent: safe to run on an existing database (`npm run db:combos`).
 */
import { PrismaClient, type SizeChartType } from "@prisma/client";

const STD = ["XS", "S", "M", "L", "XL", "XXL"];
type Combo = {
  slug: string; name: string; price: number; mrp: number; colour: [string, string]; sizes: string[]; sizeChart: SizeChartType;
  occasions: string[]; collections: string[]; best?: boolean; isNew?: boolean; featured?: boolean;
  short: string; inside: string[]; description: string; images: [string, string][]; popularity: number;
};

export const COMBOS: Combo[] = [
  { slug: "kanjeevaram-shagun-gift-combo", name: "Kanjeevaram Shagun Gift Combo", price: 27900, mrp: 31650, colour: ["Mustard", "#C9962B"], sizes: ["Free Size"], sizeChart: "SAREE",
    occasions: ["wedding", "traditional", "festive"], collections: ["bridal", "festive", "gift-combo"], best: true, featured: true, popularity: 96,
    short: "A silk-mark Kanjeevaram saree, kundan jhumkas and a zardozi potli — boxed in our velvet keepsake trunk.",
    inside: ["Meenakshi Kanjeevaram silk saree with blouse piece", "Kundan & pearl jhumkas", "Zardozi velvet potli bag", "Hand-lettered shagun card", "Signature velvet keepsake trunk"],
    description: "The gift a daughter-in-law, sister or bride remembers forever. A Silk Mark certified Kanjeevaram with a contrast korvai temple border, paired with kundan jhumkas and a hand-embroidered potli, nestled in our wine-velvet keepsake trunk with a hand-lettered shagun card.",
    images: [["/photos/combo-kanjeevaram-shagun.jpg", "Kanjeevaram saree, kundan jhumkas and potli gift combo"], ["/photos/p-meenakshi-kanjeevaram-silk-saree.jpg", "The Kanjeevaram saree"], ["/photos/p-kundan-bridal-necklace-set.jpg", "Kundan jewellery"], ["/photos/p-noori-zardozi-potli-bag.jpg", "Zardozi potli"]] },
  { slug: "banarasi-bridal-trousseau-box", name: "Banarasi Bridal Trousseau Box", price: 26500, mrp: 30400, colour: ["Ruby Red", "#9B1B30"], sizes: ["Free Size"], sizeChart: "SAREE",
    occasions: ["wedding"], collections: ["bridal", "gift-combo"], featured: true, popularity: 74,
    short: "A katan silk Banarasi saree with a kundan choker set, potli and bride-to-be treats.",
    inside: ["Gulnaar Banarasi katan silk saree with blouse piece", "Kundan choker, jhumkas & maang tikka", "Zardozi potli & silk scrunchies", "Saffron-almond barfi & oudh-rose candle", "Wine-velvet trousseau trunk"],
    description: "Everything for the bride's trousseau in one heirloom box — a hand-woven Banarasi in ruby red, a kundan bridal set, a potli for the big day and a few indulgences for the countdown.",
    images: [["/photos/combo-banarasi-bridal-trousseau.jpg", "Banarasi saree and bridal jewellery trousseau box"], ["/photos/p-gulnaar-banarasi-katan-silk-saree.jpg", "The Banarasi saree"], ["/photos/cat-bridal-wear.jpg", "Kundan bridal jewellery"], ["/photos/p-bride-to-be-luxe-hamper.jpg", "Trousseau trunk"]] },
  { slug: "organza-saree-celebration-combo", name: "Organza Saree & Jewellery Celebration Combo", price: 15900, mrp: 17900, colour: ["Lilac", "#A893B8"], sizes: ["Free Size"], sizeChart: "SAREE",
    occasions: ["party", "festive"], collections: ["gift-combo"], isNew: true, popularity: 48,
    short: "A hand-embroidered organza saree, kundan earrings and a blossom treat box — made for birthdays.",
    inside: ["Sitara hand-embroidered organza saree with blouse piece", "Kundan drop earrings", "Rose-pistachio chocolates & jasmine candle", "Birthday card with your message", "Blush keepsake box"],
    description: "A pastel organza saree scattered with hand-sewn sequin stars, paired with kundan earrings and a box of little luxuries. The birthday or anniversary gift that feels entirely hers.",
    images: [["/photos/combo-organza-saree-celebration.jpg", "Organza saree, kundan earrings and treats combo"], ["/photos/p-sitara-hand-embroidered-organza-saree.jpg", "The organza saree"], ["/photos/p-kundan-bridal-necklace-set.jpg", "Kundan jewellery"], ["/photos/p-birthday-blossom-hamper.jpg", "Celebration box"]] },
  { slug: "festive-chanderi-saree-combo", name: "Festive Chanderi Saree & Mithai Combo", price: 6950, mrp: 7900, colour: ["Mustard", "#C9962B"], sizes: ["Free Size"], sizeChart: "SAREE",
    occasions: ["festive", "traditional"], collections: ["festive", "gift-combo"], best: true, popularity: 112,
    short: "A Chanderi saree with brass diyas, artisanal mithai and a brocade potli — the perfect Diwali gift.",
    inside: ["Kesar Chanderi silk-cotton saree with blouse piece", "Hand-painted diyas & brass urli", "Kaju katli & roasted dry fruits", "Brocade potli", "Gold-foiled festive box"],
    description: "Our most-gifted festive combo. A breathable Chanderi saree with tiny zari buttis, paired with diyas, artisanal mithai and a brocade potli — ready for Diwali, Rakhi, Teej or Karwa Chauth.",
    images: [["/photos/combo-festive-chanderi-saree.jpg", "Chanderi saree with diyas and mithai combo"], ["/photos/p-kesar-chanderi-cotton-saree.jpg", "The Chanderi saree"], ["/photos/p-diwali-diya-and-mithai-hamper.jpg", "Diyas and mithai"], ["/photos/p-noori-zardozi-potli-bag.jpg", "Potli"]] },
  { slug: "anarkali-suit-kundan-combo", name: "Anarkali Suit & Kundan Jewellery Combo", price: 18900, mrp: 21800, colour: ["Emerald", "#1F5E4A"], sizes: STD, sizeChart: "SUIT",
    occasions: ["wedding", "festive", "party"], collections: ["festive", "gift-combo"], best: true, featured: true, popularity: 88,
    short: "A zardozi Anarkali set with a kundan necklace & earrings, in a keepsake box with candles.",
    inside: ["Zohra embroidered Anarkali set (kurta, churidar, dupatta)", "Kundan necklace & jhumkas", "Pair of oudh-rose candles", "Personalised note", "Velvet keepsake box"],
    description: "A floor-length 24-kali Anarkali with a zardozi yoke, paired with a matching kundan set — a complete wedding-season look, boxed and ready to give. Choose her size; free size exchange if it doesn't fit.",
    images: [["/photos/combo-anarkali-kundan.jpg", "Anarkali suit with kundan jewellery combo"], ["/photos/p-zohra-embroidered-anarkali-set.jpg", "The Anarkali set"], ["/photos/p-kundan-bridal-necklace-set.jpg", "Kundan jewellery"], ["/photos/p-anniversary-keepsake-hamper.jpg", "Keepsake box"]] },
  { slug: "chikankari-suit-gift-combo", name: "Chikankari Suit Gift Combo", price: 13500, mrp: 15200, colour: ["Ivory", "#EFE6D4"], sizes: STD, sizeChart: "SUIT",
    occasions: ["everyday", "festive", "traditional"], collections: ["gift-combo"], isNew: true, popularity: 52,
    short: "A hand-chikankari suit set with a potli, rose mist and chocolates — gentle, elegant gifting.",
    inside: ["Afreen Lucknowi chikankari suit set", "Mirror-work potli", "Kannauj rose water mist", "Rose-pistachio chocolates", "Blush keepsake box"],
    description: "Soft, timeless and endlessly wearable. A Lucknowi chikankari suit set paired with a potli and a few self-care treats — for mothers, sisters and best friends.",
    images: [["/photos/combo-chikankari-suit.jpg", "Chikankari suit gift combo"], ["/photos/p-afreen-chikankari-suit-set.jpg", "The chikankari suit"], ["/photos/p-bridesmaid-edit-hamper.jpg", "Keepsake box"], ["/photos/p-noori-zardozi-potli-bag.jpg", "Potli"]] },
  { slug: "silk-suit-festive-combo", name: "Silk Suit Festive Combo", price: 9950, mrp: 11400, colour: ["Royal Blue", "#23356B"], sizes: STD, sizeChart: "SUIT",
    occasions: ["festive", "office", "party"], collections: ["festive", "gift-combo"], popularity: 61,
    short: "A silk straight-suit set with kundan earrings, diyas and dry fruits — the festive gift for her.",
    inside: ["Ruhani silk straight suit set", "Kundan drop earrings", "Brass diyas & roasted dry fruits", "Festive card", "Gold-foiled box"],
    description: "A sleek silk suit with tonal embroidery, matched with kundan earrings and festive treats. A thoughtful Diwali or Rakhi gift for sisters, colleagues and friends.",
    images: [["/photos/combo-silk-suit-festive.jpg", "Silk suit festive combo"], ["/photos/p-ruhani-silk-straight-suit-set.jpg", "The silk suit"], ["/photos/p-diwali-diya-and-mithai-hamper.jpg", "Festive treats"], ["/photos/p-kundan-bridal-necklace-set.jpg", "Kundan jewellery"]] },
  { slug: "grand-trousseau-combo", name: "The Grand Trousseau — Saree, Suit & Jewellery", price: 44900, mrp: 52300, colour: ["Mustard", "#C9962B"], sizes: STD, sizeChart: "SUIT",
    occasions: ["wedding", "traditional"], collections: ["bridal", "gift-combo", "limited-edition"], featured: true, popularity: 39,
    short: "Our most complete gift: a Kanjeevaram saree, an Anarkali suit and a kundan bridal set in one trunk.",
    inside: ["Meenakshi Kanjeevaram silk saree with blouse piece", "Zohra embroidered Anarkali set (choose size)", "Kundan choker, jhumkas & maang tikka", "Zardozi potli", "Heritage keepsake trunk with personalised card"],
    description: "For the bride, the bride's mother, or the most important woman in your life. A heirloom Kanjeevaram, a zardozi Anarkali and a kundan bridal set — three complete looks, one breathtaking trunk.",
    images: [["/photos/combo-grand-trousseau.jpg", "Saree, suit and jewellery trousseau combo"], ["/photos/p-meenakshi-kanjeevaram-silk-saree.jpg", "The Kanjeevaram saree"], ["/photos/p-zohra-embroidered-anarkali-set.jpg", "The Anarkali set"], ["/photos/p-kundan-bridal-necklace-set.jpg", "Kundan bridal set"]] },
];

export const BUILDER_ITEMS = [
  { name: "Kanjeevaram Silk Saree", description: "Silk-mark Kanjeevaram with blouse piece", group: "Sarees & Suits", price: 2290000, image: "/photos/builder/kanjeevaram-saree.jpg", max: 1, stock: 12 },
  { name: "Banarasi Katan Saree", description: "Hand-woven Banarasi with blouse piece", group: "Sarees & Suits", price: 1790000, image: "/photos/builder/banarasi-saree.jpg", max: 1, stock: 14 },
  { name: "Embroidered Organza Saree", description: "Sequin-star organza with blouse piece", group: "Sarees & Suits", price: 1190000, image: "/photos/builder/organza-saree.jpg", max: 1, stock: 18 },
  { name: "Chanderi Saree", description: "Zari-butti Chanderi with blouse piece", group: "Sarees & Suits", price: 390000, image: "/photos/builder/chanderi-saree.jpg", max: 2, stock: 30 },
  { name: "Chikankari Suit Fabric (Unstitched)", description: "Kurta, salwar & dupatta — stitch to her size", group: "Sarees & Suits", price: 690000, image: "/photos/builder/chikankari-suit.jpg", max: 2, stock: 25 },
  { name: "Chanderi Suit Fabric (Unstitched)", description: "Zari-yoke kurta, pants & dupatta fabric", group: "Sarees & Suits", price: 390000, image: "/photos/builder/chanderi-suit.jpg", max: 2, stock: 30 },
  { name: "Anarkali Suit Fabric (Unstitched)", description: "Zardozi Anarkali fabric set with dupatta", group: "Sarees & Suits", price: 990000, image: "/photos/builder/anarkali-suit.jpg", max: 1, stock: 16 },
  { name: "Kundan Necklace Set", description: "Choker with matching jhumkas", group: "Jewellery", price: 690000, image: "/photos/builder/kundan-necklace.jpg", max: 1, stock: 24 },
  { name: "Kundan Bridal Set", description: "Choker, jhumkas & maang tikka", group: "Jewellery", price: 890000, image: "/photos/builder/bridal-jewellery.jpg", max: 1, stock: 15 },
];

export async function seedCombos(db: PrismaClient) {
  const parent = await db.category.findUnique({ where: { slug: "gift-hampers" } });
  if (!parent) throw new Error("Run the main seed first (gift-hampers category missing)");
  const cat = await db.category.upsert({
    where: { slug: "gift-combos" },
    create: { slug: "gift-combos", name: "Gift Combos", parentId: parent.id, sortOrder: -1, showOnHome: false, sizeChart: "NONE",
      description: "Saree, suit and jewellery gift combos — complete looks, beautifully boxed and ready to give.",
      metaTitle: "Saree & Suit Gift Combos for Women", metaDescription: "Gift combos with sarees, suits and kundan jewellery, packed in keepsake boxes. Perfect for weddings, Diwali, birthdays and anniversaries." },
    update: {},
  });
  let sku = 9000 + (await db.variant.count());
  for (const c of COMBOS) {
    const data = {
      name: c.name, shortDescription: c.short,
      description: `${c.description}\n\nWhat's inside: ${c.inside.join(" · ")}.`,
      fabric: "Gift combo", work: c.inside.join(", "), price: c.price * 100, compareAtPrice: c.mrp * 100, categoryId: cat.id,
      occasions: c.occasions, collections: c.collections, tags: ["gift combo", "gift", c.sizes.length > 1 ? "suit" : "saree", "jewellery"],
      isNew: !!c.isNew, isBestseller: !!c.best, isFeatured: !!c.featured, popularity: c.popularity, sizeChart: c.sizeChart, gstRate: 18, // mixed supply → highest applicable rate
      washCare: "Garments: dry clean recommended. Jewellery: store in the pouch provided, away from moisture and perfume. Edibles: consume before the best-before date.",
      metaTitle: `${c.name} | Gift Combos | REWAAS`, metaDescription: `${c.short} Free shipping above ₹1,999.`,
    };
    const existing = await db.product.findUnique({ where: { slug: c.slug } });
    if (existing) { await db.product.update({ where: { id: existing.id }, data }); continue; }
    await db.product.create({
      data: {
        ...data, slug: c.slug,
        images: { create: c.images.map(([url, alt], i) => ({ url, alt, sortOrder: i, colour: i === 0 ? c.colour[0] : null })) },
        variants: { create: c.sizes.map((size, i) => ({ sku: `RW-${sku++}`, size, colour: c.colour[0], colourHex: c.colour[1], stock: 6 + ((i * 3) % 7) })) },
      },
    });
  }
  for (const [i, it] of BUILDER_ITEMS.entries()) {
    const found = await db.hamperComponent.findFirst({ where: { name: it.name } });
    const data = { name: it.name, description: it.description, group: it.group, price: it.price, image: it.image, maxPerHamper: it.max, stock: it.stock, sortOrder: -20 + i, active: true };
    if (found) await db.hamperComponent.update({ where: { id: found.id }, data });
    else await db.hamperComponent.create({ data });
  }
  // Menu: Gift Hampers › Gift Combos
  const giftMenu = await db.menuItem.findFirst({ where: { label: "Gift Hampers", parentId: null } });
  if (giftMenu && !(await db.menuItem.findFirst({ where: { parentId: giftMenu.id, href: "/collections/gift-combos" } })))
    await db.menuItem.create({ data: { label: "Saree & Suit Gift Combos", href: "/collections/gift-combos", parentId: giftMenu.id, sortOrder: -1 } });
  // Larger boxes so a saree or suit plus accessories fits comfortably
  await db.hamperBox.updateMany({ where: { name: "The Petite Box" }, data: { capacity: 5 } });
}

if (require.main === module) {
  const db = new PrismaClient();
  seedCombos(db).then(async () => { console.log(`Gift combos ready: ${COMBOS.length} combos, ${BUILDER_ITEMS.length} builder items.`); await db.$disconnect(); })
    .catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
}
