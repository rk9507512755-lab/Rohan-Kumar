/* eslint-disable no-console */
import { PrismaClient, type SizeChartType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { componentArt, editorialArt, productArt, writeArt, type Silhouette } from "./art";
import { seedCombos } from "./combos";
import { C, CATEGORIES, HAMPER_BOXES, HAMPER_COMPONENTS, HAMPER_CARE, KURTI_CARE, PACKAGING, PRODUCTS, SAREE_CARE, SUIT_CARE } from "./catalog-data";

const db = new PrismaClient();
const slug = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);

async function main() {
  console.log("Clearing data…");
  await db.$transaction([
    db.orderEvent.deleteMany(), db.returnRequest.deleteMany(), db.orderItem.deleteMany(), db.order.deleteMany(),
    db.cartItem.deleteMany(), db.cart.deleteMany(), db.wishlistItem.deleteMany(), db.review.deleteMany(),
    db.productImage.deleteMany(), db.variant.deleteMany(), db.product.deleteMany(), db.category.updateMany({ data: { parentId: null } }),
  ]);
  await db.$transaction([
    db.category.deleteMany(), db.address.deleteMany(), db.user.deleteMany(), db.banner.deleteMany(), db.announcement.deleteMany(),
    db.menuItem.deleteMany(), db.page.deleteMany(), db.testimonial.deleteMany(), db.coupon.deleteMany(), db.hamperBox.deleteMany(),
    db.hamperComponent.deleteMany(), db.packagingOption.deleteMany(), db.newsletterSubscriber.deleteMany(),
  ]);

  // ---------- Categories ----------
  console.log("Categories…");
  const catKind: Record<string, Silhouette> = { sarees: "saree", "suits-sets": "suit", lehengas: "lehenga", kurtis: "kurti", "bridal-wear": "jewel", "gift-hampers": "hamper" };
  const catColour: Record<string, string> = { sarees: "#9B1B30", "suits-sets": "#1F5E4A", lehengas: "#E3A6A9", kurtis: "#EFE6D4", "bridal-wear": "#6B1E2A", "gift-hampers": "#5E1A2E" };
  const catIds: Record<string, string> = {};
  for (const [i, c] of CATEGORIES.entries()) {
    const image = `/photos/cat-${c.slug}.jpg`;
    const banner = writeArt(`/images/categories/${c.slug}-banner.svg`, editorialArt({ seed: c.slug, w: 1920, h: 640, colours: [catColour[c.slug], "#C9962B", "#E3A6A9"], kinds: [catKind[c.slug], catKind[c.slug], catKind[c.slug]], tone: "ivory", align: "right" }));
    const parent = await db.category.create({
      data: { slug: c.slug, name: c.name, description: c.description, image, bannerImage: banner, sortOrder: i, sizeChart: c.sizeChart as SizeChartType,
        metaTitle: `${c.name} for Women Online | REWAAS`, metaDescription: c.description },
    });
    catIds[c.slug] = parent.id;
    for (const [j, ch] of c.children.entries()) {
      const child = await db.category.create({ data: { slug: ch.slug, name: ch.name, parentId: parent.id, sortOrder: j, sizeChart: c.sizeChart as SizeChartType, showOnHome: false, description: `${ch.name} — ${c.description}` } });
      catIds[ch.slug] = child.id;
    }
  }
  const parentOf = (sub: string) => CATEGORIES.find((c) => c.children.some((ch) => ch.slug === sub))!;

  // ---------- Products ----------
  console.log("Products & images…");
  let skuN = 1000;
  const productIds: { id: string; name: string; slug: string; price: number; variants: { id: string; size: string; colour: string; sku: string }[]; image: string }[] = [];
  for (const p of PRODUCTS) {
    const s = slug(p.name);
    const parent = parentOf(p.cat);
    // Photography (public/photos) — main look + a fabric-detail crop. Extra colourways are offered as swatches.
    const c0name = C[p.colours[0]][0];
    const images: { url: string; alt: string; colour?: string; sortOrder: number }[] = [
      { url: `/photos/p-${s}.jpg`, alt: `${p.name} in ${c0name}`, colour: c0name, sortOrder: 0 },
      { url: `/photos/p-${s}-detail.jpg`, alt: `${p.name} — ${p.work ? p.work.toLowerCase() : "fabric"} detail`, sortOrder: 1 },
    ];
    images.sort((a, b) => a.sortOrder - b.sortOrder);

    const isHamper = parent.slug === "gift-hampers";
    const variants = p.colours.flatMap((ck, ci) => p.sizes.map((size, si) => {
      const stock = (p.name.length * 7 + ci * 13 + si * 5) % 19; // deterministic demo stock, some zeros
      return { sku: `RW-${skuN++}`, size, colour: C[ck][0], colourHex: C[ck][1], stock: stock === 0 && si === 0 ? 0 : stock + (isHamper ? 20 : 2) };
    }));
    const created = await db.product.create({
      data: {
        slug: s, name: p.name, shortDescription: p.short, description: p.description, fabric: p.fabric, work: p.work,
        washCare: isHamper ? HAMPER_CARE : parent.slug === "sarees" || parent.slug === "lehengas" || parent.slug === "bridal-wear" ? SAREE_CARE : parent.slug === "kurtis" ? KURTI_CARE : SUIT_CARE,
        price: p.price * 100, compareAtPrice: p.mrp ? p.mrp * 100 : null, categoryId: catIds[p.cat], occasions: p.occasions,
        collections: p.collections ?? [], tags: [p.fabric.toLowerCase(), ...(p.work ? p.work.toLowerCase().split(/,\s*/) : []), parent.name.toLowerCase()],
        isNew: !!p.isNew, isBestseller: !!p.best, isFeatured: !!p.featured, popularity: p.popularity,
        sizeChart: parent.sizeChart as SizeChartType, createdAt: daysAgo(p.daysAgo),
        metaTitle: `${p.name} | ${parent.name} | REWAAS`,
        metaDescription: `${p.short} Shop ${p.name} in ${p.fabric} at REWAAS. Free shipping above ₹1,999, easy 7-day exchanges.`,
        images: { create: images },
        variants: { create: variants },
      },
      include: { variants: true },
    });
    productIds.push({ id: created.id, name: created.name, slug: created.slug, price: created.price, variants: created.variants, image: images[0].url });
  }

  // ---------- Reviews ----------
  console.log("Reviews…");
  const reviewers = [["Ananya Sharma", "New Delhi"], ["Meera Iyer", "Chennai"], ["Priya Kapoor", "Mumbai"], ["Sneha Reddy", "Hyderabad"], ["Ishita Bose", "Kolkata"], ["Kavya Nair", "Kochi"], ["Riya Malhotra", "Chandigarh"], ["Aditi Joshi", "Pune"], ["Fatima Sheikh", "Lucknow"], ["Simran Kaur", "Amritsar"]];
  const reviewTexts = [
    ["Even more beautiful in person", "The colour is richer than the photos and the fabric feels luxurious. Got so many compliments at my cousin's wedding."],
    ["Beautifully packed", "Arrived in a gorgeous box with a handwritten note. The finishing and embroidery are flawless."],
    ["Perfect fit", "Followed the size chart and it fit perfectly. The fall and drape are lovely."],
    ["Worth every rupee", "Premium quality, you can tell it's handcrafted. Will definitely shop again."],
    ["Lovely, slightly different shade", "The shade is a little deeper than on my screen but still stunning. Delivery was quick."],
    ["My new favourite", "So comfortable I wore it all day without a single adjustment. The zari is delicate and elegant."],
  ];
  for (const [i, p] of productIds.entries()) {
    const n = 2 + (i % 4);
    for (let r = 0; r < n; r++) {
      const [name, city] = reviewers[(i + r * 3) % reviewers.length];
      const [title, body] = reviewTexts[(i + r) % reviewTexts.length];
      await db.review.create({ data: { productId: p.id, name, city, rating: r === 3 ? 4 : 5 - ((i + r) % 5 === 4 ? 1 : 0), title, body, verified: true, createdAt: daysAgo(2 + r * 4 + (i % 7)), images: r === 0 && i % 3 === 0 ? [p.image] : [] } });
    }
  }

  // ---------- Hamper builder ----------
  console.log("Gift Studio…");
  for (const [i, b] of HAMPER_BOXES.entries()) {
    const image = writeArt(`/images/gift-studio/box-${slug(b.name)}.svg`, productArt({ seed: b.name, kind: "hamper", colour: b.colour, motif: i === 1 ? "jaal" : i === 2 ? "check" : "plain", variant: 0 }));
    await db.hamperBox.create({ data: { name: b.name, description: b.description, image, price: b.price, capacity: b.capacity, dimensions: b.dimensions, stock: b.stock, sortOrder: i } });
  }
  writeArt(`/images/gift-studio/box-signature.svg`, productArt({ seed: "sig", kind: "hamper", colour: "#5E1A2E", motif: "jaal", variant: 0 }));
  for (const [i, c] of HAMPER_COMPONENTS.entries()) {
    const image = writeArt(`/images/gift-studio/item-${slug(c.name)}.svg`, componentArt({ seed: c.name, shape: c.shape, colour: c.colour }));
    await db.hamperComponent.create({ data: { name: c.name, description: c.description, group: c.group, image, price: c.price, stock: 80 + i * 3, maxPerHamper: c.max ?? 3, sortOrder: i } });
  }
  for (const [i, p] of PACKAGING.entries()) await db.packagingOption.create({ data: { ...p, sortOrder: i } });

  // ---------- Editorial imagery ----------
  console.log("Editorial art…");
  const hero = [
    { key: "hero-1", colours: ["#9B1B30", "#C9962B", "#E3A6A9"], kinds: ["saree", "lehenga", "suit"] as Silhouette[], tone: "wine" as const },
    { key: "hero-2", colours: ["#E3A6A9", "#A893B8", "#A8CBB5"], kinds: ["lehenga", "suit", "lehenga"] as Silhouette[], tone: "blush" as const },
    { key: "hero-3", colours: ["#5E1A2E", "#B8914F", "#1F5E4A"], kinds: ["hamper", "potli", "hamper"] as Silhouette[], tone: "ivory" as const },
  ];
  for (const h of hero) {
    writeArt(`/images/editorial/${h.key}.svg`, editorialArt({ seed: h.key, w: 1920, h: 960, colours: h.colours, kinds: h.kinds, tone: h.tone, align: "right" }));
    writeArt(`/images/editorial/${h.key}-mobile.svg`, editorialArt({ seed: h.key, w: 900, h: 1300, colours: h.colours, kinds: h.kinds.slice(0, 2), tone: h.tone, align: "center" }));
  }
  writeArt(`/images/editorial/bridal-edit.svg`, editorialArt({ seed: "bridal", w: 1200, h: 1500, colours: ["#9B1B30", "#6B1E2A"], kinds: ["lehenga", "saree"], tone: "wine", align: "center" }));
  writeArt(`/images/editorial/featured.svg`, editorialArt({ seed: "featured", w: 2200, h: 900, colours: ["#1C2541", "#B8914F", "#1E5F66", "#5E1A2E"], kinds: ["lehenga", "saree", "suit", "lehenga"], tone: "wine", align: "right" }));
  writeArt(`/images/editorial/featured-mobile.svg`, editorialArt({ seed: "featured", w: 900, h: 1200, colours: ["#1C2541", "#B8914F"], kinds: ["lehenga", "saree"], tone: "wine", align: "center" }));
  writeArt(`/images/editorial/gift-studio.svg`, editorialArt({ seed: "gift", w: 1400, h: 1000, colours: ["#5E1A2E", "#A9824B", "#E3A6A9"], kinds: ["hamper", "potli", "hamper"], tone: "blush", align: "center" }));
  writeArt(`/images/editorial/about.svg`, editorialArt({ seed: "about", w: 1600, h: 900, colours: ["#C9962B", "#9B1B30", "#1F5E4A"], kinds: ["saree", "saree", "saree"], tone: "ivory", align: "center" }));
  const occ: [string, string, Silhouette][] = [["wedding", "#9B1B30", "lehenga"], ["festive", "#C9962B", "saree"], ["party", "#A893B8", "lehenga"], ["everyday", "#EFE6D4", "kurti"], ["office", "#1E5F66", "suit"], ["traditional", "#A3215F", "saree"]];
  for (const [k, colour, kind] of occ) writeArt(`/images/occasions/${k}.svg`, productArt({ seed: "occ" + k, kind, colour, motif: k === "office" ? "stripe" : "jaal", variant: 0 }));
  const bridalTiles: [string, string, Silhouette][] = [["bridal-sarees", "#9B1B30", "saree"], ["designer-lehengas", "#6B1E2A", "lehenga"], ["wedding-suits", "#1F5E4A", "suit"], ["bridal-accessories", "#C2185B", "jewel"], ["bride-to-be-hampers", "#5E1A2E", "hamper"], ["bridesmaid-gifts", "#E3A6A9", "hamper"]];
  for (const [k, colour, kind] of bridalTiles) writeArt(`/images/bridal/${k}.svg`, productArt({ seed: "br" + k, kind, colour, motif: "jaal", variant: 0 }));
  const gifts: [string, string][] = [["bridal-gift-hampers", "#5E1A2E"], ["bridesmaid-hampers", "#E3A6A9"], ["wedding-return-gifts", "#C2185B"], ["festive-gift-hampers", "#C9962B"], ["birthday-hampers", "#E8A584"], ["anniversary-gifts", "#9B1B30"], ["corporate-gifts", "#1C2541"], ["personalised-hampers", "#1F5E4A"]];
  for (const [k, colour] of gifts) writeArt(`/images/gifting/${k}.svg`, productArt({ seed: "g" + k, kind: k === "wedding-return-gifts" ? "potli" : "hamper", colour, motif: "buti", variant: 0 }));
  const insta: [string, Silhouette][] = [["#9B1B30", "saree"], ["#5E1A2E", "hamper"], ["#E3A6A9", "lehenga"], ["#1F5E4A", "suit"], ["#C9962B", "potli"], ["#EFE6D4", "kurti"], ["#A893B8", "lehenga"], ["#1E5F66", "saree"]];
  insta.forEach(([colour, kind], i) => writeArt(`/images/instagram/post-${i + 1}.svg`, productArt({ seed: "ig" + i, kind, colour, motif: (["buti", "jaal", "stripe", "chevron"] as const)[i % 4], variant: i % 3 === 1 ? 2 : 0 })));
  writeArt(`/images/og-default.svg`, editorialArt({ seed: "og", w: 1200, h: 630, colours: ["#9B1B30", "#C9962B", "#E3A6A9"], kinds: ["saree", "lehenga", "suit"], tone: "wine", align: "right" }));

  // ---------- Content ----------
  console.log("Content…");
  await db.banner.createMany({
    data: [
      { eyebrow: "The Festive Edit 2026", title: "Elegance in Every Thread.", subtitle: "Discover timeless Indian fashion, thoughtfully curated for every occasion.", ctaLabel: "Shop Collection", ctaHref: "/collections/all", cta2Label: "Explore New Arrivals", cta2Href: "/collections/new-arrivals", desktopImage: "/photos/hero-1.jpg", mobileImage: "/photos/hero-1-mobile.jpg", sortOrder: 0 },
      { eyebrow: "The Bridal Edit", title: "For the Day You've Always Imagined.", subtitle: "Heirloom lehengas and wedding silks, made to be remembered.", ctaLabel: "Explore Bridal", ctaHref: "/collections/bridal", cta2Label: "Book a Styling Call", cta2Href: "/pages/contact", desktopImage: "/photos/hero-2.jpg", mobileImage: "/photos/hero-2-mobile.jpg", sortOrder: 1 },
      { eyebrow: "REWAAS Gift Studio", title: "Gifts, Thoughtfully Composed.", subtitle: "Curated hampers for brides, festivals and every milestone — or create your own.", ctaLabel: "Create Your Own Hamper", ctaHref: "/gift-studio/create", cta2Label: "Shop Hampers", cta2Href: "/collections/gift-hampers", desktopImage: "/photos/hero-3.jpg", mobileImage: "/photos/hero-3-mobile.jpg", sortOrder: 2 },
      { eyebrow: "Limited Edition", title: "Midnight Zari", subtitle: "A capsule of twelve pieces in deep midnight and antique gold — woven once, never repeated.", ctaLabel: "Discover the Capsule", ctaHref: "/collections/limited-edition", desktopImage: "/photos/featured.jpg", mobileImage: "/photos/featured-mobile.jpg", placement: "featured", sortOrder: 0 },
    ],
  });
  await db.announcement.createMany({
    data: [
      { text: "Complimentary shipping on orders above ₹1,999", href: "/pages/shipping-policy", sortOrder: 0 },
      { text: "Discover our new Festive Collection", href: "/collections/festive", sortOrder: 1 },
      { text: "Thoughtfully curated gifting — create your own hamper", href: "/gift-studio/create", sortOrder: 2 },
      { text: "Use WELCOME10 for 10% off your first order", href: "/collections/new-arrivals", sortOrder: 3 },
    ],
  });

  const menu = [
    { label: "Sarees", href: "/collections/sarees", image: "/photos/cat-sarees.jpg", children: CATEGORIES[0].children },
    { label: "Suits & Sets", href: "/collections/suits-sets", image: "/photos/cat-suits-sets.jpg", children: CATEGORIES[1].children },
    { label: "Lehengas", href: "/collections/lehengas", image: "/photos/cat-lehengas.jpg", children: CATEGORIES[2].children },
    { label: "Kurtis", href: "/collections/kurtis", image: "/photos/cat-kurtis.jpg", children: CATEGORIES[3].children },
    { label: "Bridal Collection", href: "/collections/bridal", image: "/photos/bridal-edit.jpg", children: [
      { slug: "bridal-lehengas", name: "Designer Lehengas" }, { slug: "kanjeevaram-sarees", name: "Bridal Sarees" }, { slug: "anarkali-suits", name: "Wedding Suits" },
      { slug: "bridal-accessories", name: "Bridal Accessories" }, { slug: "bridal-hampers", name: "Bride-to-Be Hampers" }, { slug: "dupattas", name: "Bridal Dupattas" } ] },
    { label: "Gift Hampers", href: "/gift-studio", image: "/photos/cat-gift-hampers.jpg", children: [
      ...CATEGORIES[5].children, { slug: "__create", name: "Create Your Own Hamper" } ] },
    { label: "Festive Collection", href: "/collections/festive", image: null, children: [] },
    { label: "New Arrivals", href: "/collections/new-arrivals", image: null, children: [] },
  ];
  for (const [i, m] of menu.entries()) {
    const parent = await db.menuItem.create({ data: { label: m.label, href: m.href, image: m.image, sortOrder: i } });
    for (const [j, ch] of m.children.entries())
      await db.menuItem.create({ data: { label: ch.name, href: ch.slug === "__create" ? "/gift-studio/create" : `/collections/${ch.slug}`, parentId: parent.id, sortOrder: j } });
  }

  await db.testimonial.createMany({
    data: [
      { name: "Aishwarya Menon", city: "Bengaluru", productName: "Meenakshi Kanjeevaram Silk Saree", productSlug: "meenakshi-kanjeevaram-silk-saree", rating: 5, text: "I wore the Meenakshi Kanjeevaram for my engagement and my mother couldn't stop touching the border. The weave is exquisite, and it arrived wrapped like an heirloom.", image: "/photos/p-meenakshi-kanjeevaram-silk-saree.jpg", sortOrder: 0 },
      { name: "Tanya Arora", city: "Gurugram", productName: "Bride-to-Be Luxe Hamper", productSlug: "bride-to-be-luxe-hamper", rating: 5, text: "Sent the Bride-to-Be hamper to my best friend in Dubai. She video-called me in tears. The trunk alone is something she'll keep forever.", image: "/photos/p-bride-to-be-luxe-hamper.jpg", sortOrder: 1 },
      { name: "Nikita Deshpande", city: "Pune", productName: "Zohra Embroidered Anarkali Set", productSlug: "zohra-embroidered-anarkali-set", rating: 5, text: "The fit was perfect straight out of the box and the zardozi is so neat. The team even helped me choose my size on WhatsApp.", image: "/photos/p-zohra-embroidered-anarkali-set.jpg", sortOrder: 2 },
      { name: "Shreya Banerjee", city: "Kolkata", productName: "Ada Chikankari Kurti", productSlug: "ada-chikankari-kurti", rating: 4, text: "My third Ada kurti! Soft, breathable and the chikankari is genuinely handmade. Perfect for long office days.", image: "/photos/p-ada-chikankari-kurti.jpg", sortOrder: 3 },
      { name: "Rukhsar Khan", city: "Hyderabad", productName: "Gulabo Festive Lehenga", productSlug: "gulabo-festive-lehenga", rating: 5, text: "Ordered five Gulabo lehengas for my bridesmaids. Each one arrived beautifully pressed with a name tag — such a thoughtful touch.", image: "/photos/p-gulabo-festive-lehenga.jpg", sortOrder: 4 },
    ],
  });

  await db.coupon.createMany({
    data: [
      { code: "WELCOME10", description: "10% off your first order (max ₹1,500)", type: "PERCENT", value: 10, maxDiscount: 150000, minSubtotal: 199900 },
      { code: "FESTIVE500", description: "₹500 off orders above ₹5,000", type: "FLAT", value: 50000, minSubtotal: 500000 },
      { code: "BRIDAL15", description: "15% off bridal orders above ₹50,000 (max ₹15,000)", type: "PERCENT", value: 15, maxDiscount: 1500000, minSubtotal: 5000000 },
    ],
  });

  const pages: { slug: string; title: string; body: string }[] = [
    { slug: "about", title: "About REWAAS", body: `## The Beauty of Being You\nREWAAS was born in Jaipur from a simple belief: that Indian craft deserves to be worn, loved and lived in — not saved for a glass cabinet.\nWe work directly with weavers in Varanasi and Kanchipuram, chikankari artisans in Lucknow, block printers in Sanganer and bandhani makers in Jamnagar. Every piece carries the hands that made it.\n## Our Promise\n- Handcrafted, small-batch collections\n- Fair wages and long-term partnerships with artisan clusters\n- Silk Mark certified silks and natural dyes wherever possible\n- Thoughtful, plastic-free packaging\n## The Gift Studio\nGifting is a language in Indian homes. Our Gift Studio composes hampers for brides, bridesmaids, festivals and milestones — or lets you build your own, piece by piece.` },
    { slug: "contact", title: "Contact Us", body: `## We'd love to hear from you\nOur client care team is available Monday to Saturday, 10 am – 7 pm IST.\n- **WhatsApp:** +91 99999 99999\n- **Email:** [care@rewaas.com](mailto:care@rewaas.com)\n- **Bridal styling appointments:** [bridal@rewaas.com](mailto:bridal@rewaas.com)\n- **Corporate gifting:** [gifting@rewaas.com](mailto:gifting@rewaas.com)\n## Studio\nREWAAS Studio, Jaipur, Rajasthan 302001, India. Visits by appointment.` },
    { slug: "shipping-policy", title: "Shipping Policy", body: `## Delivery across India\nWe ship to over 26,000 PIN codes across India through trusted courier partners.\n- Complimentary shipping on orders above ₹1,999; a flat ₹99 applies below that.\n- Ready-to-ship orders are dispatched within 1–2 business days.\n- Metro cities: 2–4 business days. Rest of India: 4–7 business days.\n- Made-to-measure bridal pieces: 4–6 weeks; our atelier will confirm timelines with you.\n- Cash on Delivery is available on orders up to ₹25,000 for a ₹49 handling fee.\n## Tracking\nYou'll receive a tracking link by email and SMS once your order ships. You can also [track your order here](/track-order).` },
    { slug: "returns-exchanges", title: "Return & Exchange Policy", body: `## Easy 7-day exchanges and returns\nIf something isn't quite right, request a return or exchange within 7 days of delivery from your [account](/account/orders).\n- Items must be unused, unwashed and with all original tags and packaging.\n- Exchanges for size are free. Returns are refunded to the original payment method within 5–7 business days of pickup, or as store credit instantly.\n- COD orders are refunded via bank transfer or store credit.\n## Not eligible\n- Made-to-measure and customised pieces, including personalised hampers\n- Edible items, candles and beauty products in hampers\n- Jewellery and accessories (for hygiene reasons), unless damaged on arrival\n## Damaged or incorrect item?\nPlease share an unboxing video within 48 hours of delivery and we'll make it right.` },
    { slug: "privacy-policy", title: "Privacy Policy", body: `## Your privacy matters\nThis policy explains what we collect when you shop with REWAAS and how we use it, in line with the Digital Personal Data Protection Act, 2023.\n## What we collect\n- Contact and delivery details you provide at checkout or in your account\n- Order history and wishlist\n- Device and usage data via cookies to keep your cart and improve the site\n## Payments\nPayments are processed by Razorpay. We never see or store your full card details.\n## Your choices\nYou can update your details or request deletion of your account at any time by writing to [care@rewaas.com](mailto:care@rewaas.com).` },
    { slug: "terms", title: "Terms & Conditions", body: `## Using this site\nBy placing an order on rewaas.com you agree to these terms.\n- Prices are in Indian Rupees and inclusive of GST.\n- Handcrafted products may have slight irregularities in weave, print or colour — these are the hallmark of handwork, not defects.\n- Colours may vary slightly due to photography and screen settings.\n- We reserve the right to cancel orders in case of pricing errors or stock unavailability, with a full refund.\n- Coupons cannot be combined and have no cash value.\n## Governing law\nThese terms are governed by the laws of India, with courts at Jaipur having exclusive jurisdiction.` },
    { slug: "faqs", title: "Frequently Asked Questions", body: `## Orders\n### How do I know my size?\nEvery clothing product has a size chart on its page. Still unsure? WhatsApp us your measurements and our stylists will help.\n### Can I modify or cancel my order?\nYou can cancel from your account before the order ships. For changes, contact us within 12 hours.\n## Payments\n### Which payment methods do you accept?\nUPI, credit and debit cards, net banking and wallets via Razorpay, and Cash on Delivery on eligible orders.\n### Is GST included?\nYes — all prices include GST. Your invoice shows the GST breakup.\n## Gifting\n### Can you ship a gift directly to someone?\nYes. Add a gift message at checkout and we'll send the order without a price tag or invoice in the box.\n### Do you do bulk or corporate orders?\nYes — write to [gifting@rewaas.com](mailto:gifting@rewaas.com) for orders of 25 hampers or more.` },
  ];
  for (const p of pages) await db.page.create({ data: { ...p, metaDescription: `${p.title} — REWAAS` } });

  // ---------- Users ----------
  console.log("Users & demo orders…");
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || "admin@rewaas.com").toLowerCase();
  const adminPw = process.env.SEED_ADMIN_PASSWORD || "ChangeMe@123";
  await db.user.create({ data: { email: adminEmail, name: "REWAAS Admin", role: "ADMIN", passwordHash: await bcrypt.hash(adminPw, 12) } });
  const demoHash = await bcrypt.hash("Demo@1234", 12);
  const customers = [];
  const names = ["Ananya Sharma", "Meera Iyer", "Priya Kapoor", "Sneha Reddy", "Ishita Bose", "Kavya Nair", "Riya Malhotra", "Aditi Joshi", "Fatima Sheikh", "Simran Kaur", "Pooja Verma", "Nandini Rao"];
  const cities: [string, string, string][] = [["New Delhi", "Delhi", "110017"], ["Chennai", "Tamil Nadu", "600040"], ["Mumbai", "Maharashtra", "400050"], ["Hyderabad", "Telangana", "500034"], ["Kolkata", "West Bengal", "700019"], ["Kochi", "Kerala", "682020"], ["Chandigarh", "Chandigarh", "160017"], ["Pune", "Maharashtra", "411001"], ["Lucknow", "Uttar Pradesh", "226001"], ["Amritsar", "Punjab", "143001"], ["Jaipur", "Rajasthan", "302001"], ["Bengaluru", "Karnataka", "560038"]];
  for (const [i, name] of names.entries()) {
    const email = i === 0 ? "demo@rewaas.com" : `${name.split(" ")[0].toLowerCase()}@example.com`;
    const [city, state, pincode] = cities[i];
    const u = await db.user.create({
      data: { email, name, phone: `98${String(10000000 + i * 7654321).slice(0, 8)}`, passwordHash: demoHash, createdAt: daysAgo(150 - i * 11),
        addresses: { create: { name, phone: `98${String(10000000 + i * 7654321).slice(0, 8)}`, line1: `${12 + i}, ${["Rose Villa", "Lotus Apartments", "Green Park", "Palm Residency"][i % 4]}`, line2: "Near City Market", city, state, pincode, isDefault: true } } },
      include: { addresses: true },
    });
    customers.push(u);
  }
  const statuses = ["DELIVERED", "DELIVERED", "DELIVERED", "SHIPPED", "PROCESSING", "CONFIRMED", "DELIVERED", "CANCELLED"] as const;
  let orderSeq = 0;
  for (let d = 120; d >= 0; d -= 3) {
    const cust = customers[(orderSeq * 5) % customers.length];
    const addr = cust.addresses[0];
    const picks = [productIds[(orderSeq * 7) % productIds.length], ...(orderSeq % 3 === 0 ? [productIds[(orderSeq * 11 + 3) % productIds.length]] : [])];
    const items = picks.map((p) => { const v = p.variants[orderSeq % p.variants.length]; return { productId: p.id, variantId: v.id, name: p.name, image: p.image, sku: v.sku, size: v.size, colour: v.colour, quantity: 1, unitPrice: p.price, total: p.price, gstRate: p.price <= 250000 ? 5 : 18 }; });
    const subtotal = items.reduce((a, b) => a + b.total, 0);
    const shippingFee = subtotal >= 199900 ? 0 : 9900;
    const status = d < 6 ? (["CONFIRMED", "PROCESSING"] as const)[orderSeq % 2] : statuses[orderSeq % statuses.length];
    const method = orderSeq % 4 === 0 ? "COD" : "RAZORPAY";
    const created = daysAgo(d);
    await db.order.create({
      data: {
        number: `RW${(100000 + orderSeq * 7919).toString(36).toUpperCase()}`, userId: cust.id, email: cust.email, phone: cust.phone ?? "9800000000",
        shippingAddress: { name: addr.name, phone: addr.phone, line1: addr.line1, line2: addr.line2, city: addr.city, state: addr.state, pincode: addr.pincode },
        subtotal, shippingFee, taxAmount: items.reduce((a, it) => a + Math.round(it.total - it.total / (1 + it.gstRate / 100)), 0), total: subtotal + shippingFee,
        status, paymentMethod: method, paymentStatus: status === "CANCELLED" ? (method === "COD" ? "PENDING" : "REFUNDED") : method === "COD" && status !== "DELIVERED" ? "PENDING" : "PAID",
        courier: ["SHIPPED", "DELIVERED"].includes(status) ? "Delhivery" : null, trackingNumber: ["SHIPPED", "DELIVERED"].includes(status) ? `DL${(98765432 + orderSeq * 13).toString()}` : null,
        createdAt: created, estimatedDelivery: new Date(created.getTime() + 5 * 86400000),
        items: { create: items },
        events: { create: [{ status: "CONFIRMED", createdAt: created, note: "Order placed" }, ...(status !== "CONFIRMED" ? [{ status, createdAt: new Date(created.getTime() + 2 * 86400000) }] : [])] },
      },
    });
    orderSeq++;
  }
  await seedCombos(db);
  await db.newsletterSubscriber.createMany({ data: ["ananya@example.com", "meera@example.com", "shreya@example.com"].map((email) => ({ email, source: "footer" })) });

  console.log(`\nSeed complete: ${productIds.length} products, ${orderSeq} demo orders.`);
  console.log(`Admin login: ${adminEmail} / ${adminPw === "ChangeMe@123" ? "ChangeMe@123 (change it!)" : "(from SEED_ADMIN_PASSWORD)"}`);
  console.log("Demo customer: demo@rewaas.com / Demo@1234");
}

main().then(() => db.$disconnect()).catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
