import type { Motif, Silhouette } from "./art";

export const C = {
  ruby: ["Ruby Red", "#9B1B30"], emerald: ["Emerald", "#1F5E4A"], royal: ["Royal Blue", "#23356B"], mustard: ["Mustard", "#C9962B"],
  blush: ["Blush Pink", "#E3A6A9"], ivory: ["Ivory", "#EFE6D4"], wine: ["Wine", "#5E1A2E"], peach: ["Peach", "#E8A584"],
  lilac: ["Lilac", "#A893B8"], mint: ["Mint", "#A8CBB5"], black: ["Black", "#1F1A1A"], teal: ["Teal", "#1E5F66"],
  magenta: ["Magenta", "#A3215F"], gold: ["Antique Gold", "#B8914F"], rani: ["Rani Pink", "#C2185B"], bottle: ["Bottle Green", "#1D4A36"],
  navy: ["Midnight Navy", "#1C2541"], rust: ["Rust", "#A0482B"], beige: ["Sand Beige", "#D8C3A5"], sky: ["Powder Blue", "#8DB3CF"],
  lemon: ["Lemon", "#E7D36F"], maroon: ["Maroon", "#6B1E2A"], orange: ["Marigold", "#D9733B"], sage: ["Sage", "#9CAF88"],
} as const;
type ColourKey = keyof typeof C;

export type SeedProduct = {
  name: string;
  cat: string; // subcategory slug
  kind: Silhouette;
  motif: Motif;
  fabric: string;
  work?: string;
  price: number; // rupees
  mrp?: number;
  colours: ColourKey[];
  sizes: string[];
  occasions: string[];
  collections?: string[];
  isNew?: boolean;
  best?: boolean;
  featured?: boolean;
  short: string;
  description: string;
  daysAgo: number;
  popularity: number;
};

const FREE = ["Free Size"];
const STD = ["XS", "S", "M", "L", "XL", "XXL"];
const STD_SHORT = ["S", "M", "L", "XL", "XXL"];

export const CATEGORIES = [
  { slug: "sarees", name: "Sarees", sizeChart: "SAREE", description: "Handwoven Banarasi, Kanjeevaram, organza and georgette sarees — six yards of heritage, styled for today.", children: [
    { slug: "banarasi-sarees", name: "Banarasi Sarees" }, { slug: "kanjeevaram-sarees", name: "Kanjeevaram Sarees" },
    { slug: "organza-sarees", name: "Organza Sarees" }, { slug: "georgette-chiffon-sarees", name: "Georgette & Chiffon" },
    { slug: "cotton-linen-sarees", name: "Cotton & Linen Sarees" } ] },
  { slug: "suits-sets", name: "Suits & Sets", sizeChart: "SUIT", description: "Anarkalis, shararas and straight suits with hand embroidery, finished with signature dupattas.", children: [
    { slug: "anarkali-suits", name: "Anarkali Suits" }, { slug: "straight-suits", name: "Straight Suits" },
    { slug: "sharara-palazzo-sets", name: "Sharara & Palazzo Sets" }, { slug: "co-ord-sets", name: "Co-ord Sets" } ] },
  { slug: "lehengas", name: "Lehengas", sizeChart: "LEHENGA", description: "From heirloom bridal lehengas to lightweight festive silhouettes — crafted to be remembered.", children: [
    { slug: "bridal-lehengas", name: "Bridal Lehengas" }, { slug: "festive-lehengas", name: "Festive Lehengas" },
    { slug: "lightweight-lehengas", name: "Lightweight Lehengas" } ] },
  { slug: "kurtis", name: "Kurtis", sizeChart: "KURTI", description: "Chikankari, block prints and easy silhouettes for the everyday, the office and everything after.", children: [
    { slug: "embroidered-kurtis", name: "Embroidered Kurtis" }, { slug: "printed-kurtis", name: "Printed Kurtis" },
    { slug: "kurta-sets", name: "Kurta Sets" } ] },
  { slug: "bridal-wear", name: "Bridal Wear", sizeChart: "NONE", description: "Bridal accessories, dupattas and finishing pieces for the bride and her circle.", children: [
    { slug: "bridal-accessories", name: "Bridal Accessories" }, { slug: "dupattas", name: "Dupattas" } ] },
  { slug: "gift-hampers", name: "Gift Hampers", sizeChart: "NONE", description: "Thoughtfully curated hampers for brides, bridesmaids, festivals and every milestone worth celebrating.", children: [
    { slug: "bridal-hampers", name: "Bridal & Bridesmaid Hampers" }, { slug: "festive-hampers", name: "Festive Hampers" },
    { slug: "celebration-hampers", name: "Birthday & Anniversary" }, { slug: "corporate-gifts", name: "Corporate Gifts" },
    { slug: "wedding-return-gifts", name: "Wedding Return Gifts" } ] },
] as const;

export const SAREE_CARE = "Dry clean only. Store folded in a muslin cloth, refold every few months to protect the zari. Avoid spraying perfume directly on the fabric.";
export const SUIT_CARE = "Dry clean recommended for the first wash. Thereafter gentle hand wash in cold water with mild detergent; dry in shade. Iron on reverse.";
export const KURTI_CARE = "Hand wash or gentle machine wash in cold water. Wash dark colours separately. Dry in shade and iron on medium heat.";
export const HAMPER_CARE = "Store in a cool, dry place away from direct sunlight. Consume edibles before the best-before date printed on the pack.";

export const PRODUCTS: SeedProduct[] = [
  // ---------------- SAREES ----------------
  { name: "Gulnaar Banarasi Katan Silk Saree", cat: "banarasi-sarees", kind: "saree", motif: "buti", fabric: "Pure Katan Silk", work: "Kadwa zari weaving", price: 18950, mrp: 22500, colours: ["ruby", "emerald"], sizes: FREE, occasions: ["wedding", "festive", "traditional"], collections: ["bridal", "festive"], best: true, featured: true, daysAgo: 40, popularity: 182,
    short: "Handwoven katan silk with kadwa-woven gold buttis and a heavy floral pallu.",
    description: "Woven on a pit loom in Varanasi over nineteen days, the Gulnaar saree carries gold zari buttis across a lustrous katan silk body. Its pallu blooms with a dense jaal of gulnaar (pomegranate flower) motifs, finished with a broad konia border. Comes with an unstitched running blouse piece in matching zari." },
  { name: "Noor Tissue Banarasi Saree", cat: "banarasi-sarees", kind: "saree", motif: "stripe", fabric: "Tissue Silk", work: "Zari stripes", price: 14500, mrp: 16900, colours: ["gold", "blush"], sizes: FREE, occasions: ["wedding", "festive", "party"], collections: ["festive"], isNew: true, daysAgo: 6, popularity: 64,
    short: "Liquid-gold tissue silk with fine woven stripes — made to catch candlelight.",
    description: "A shimmering tissue silk Banarasi with alternating gold and silver zari stripes and a slim scalloped border. Featherlight and fluid, it drapes beautifully for sangeet nights and festive evenings. Includes a contrast brocade blouse piece." },
  { name: "Meenakshi Kanjeevaram Silk Saree", cat: "kanjeevaram-sarees", kind: "saree", motif: "check", fabric: "Pure Mulberry Silk", work: "Korvai border, temple motifs", price: 24800, mrp: 28500, colours: ["mustard", "magenta"], sizes: FREE, occasions: ["wedding", "traditional"], collections: ["bridal", "limited-edition"], best: true, featured: true, daysAgo: 55, popularity: 160,
    short: "Silk-mark certified Kanjeevaram with a contrast korvai temple border.",
    description: "Woven in Kanchipuram with the traditional korvai technique, this heirloom saree pairs a checked mustard body with a contrasting magenta temple border and a rich pallu of annam (swan) and mayil (peacock) motifs. Silk Mark certified. Blouse piece included." },
  { name: "Mehr Kanjeevaram Saree", cat: "kanjeevaram-sarees", kind: "saree", motif: "jaal", fabric: "Pure Mulberry Silk", work: "Zari jaal", price: 21500, mrp: 23900, colours: ["bottle", "wine"], sizes: FREE, occasions: ["wedding", "festive", "traditional"], collections: ["bridal"], daysAgo: 70, popularity: 88,
    short: "Deep jewel tones with an all-over zari jaal and rich mango-motif pallu.",
    description: "A jewel-toned Kanjeevaram woven with an all-over zari jaal, finished with a pallu of mango (manga) motifs. Built to be passed down — and worn at every wedding until then." },
  { name: "Sitara Hand-Embroidered Organza Saree", cat: "organza-sarees", kind: "saree", motif: "buti", fabric: "Organza", work: "Hand embroidery, sequins", price: 12900, mrp: 14900, colours: ["lilac", "mint", "blush"], sizes: FREE, occasions: ["party", "festive", "wedding"], collections: ["festive"], isNew: true, best: true, daysAgo: 3, popularity: 140,
    short: "Sheer organza scattered with hand-sewn sequin stars and a scalloped border.",
    description: "Pastel organza scattered with hand-sewn sitara (star) sequins and finished with a delicate cut-work scalloped border. Pairs with a sleeveless sequinned blouse for cocktail evenings or a high neck for day ceremonies. Includes an unstitched blouse piece." },
  { name: "Aab Floral Organza Saree", cat: "organza-sarees", kind: "saree", motif: "jaal", fabric: "Organza", work: "Digital floral print, gota lace", price: 7450, mrp: 8900, colours: ["peach", "sky"], sizes: FREE, occasions: ["party", "festive"], isNew: true, daysAgo: 9, popularity: 58,
    short: "Painterly florals on soft organza, edged with fine gota lace.",
    description: "Inspired by Mughal garden murals, Aab is printed with soft watercolour florals and finished with a slim gota lace border. Lightweight, easy to drape, and effortless for day functions." },
  { name: "Rangrez Bandhani Georgette Saree", cat: "georgette-chiffon-sarees", kind: "saree", motif: "buti", fabric: "Georgette", work: "Hand-tied bandhani, gota patti", price: 8950, mrp: 10500, colours: ["rani", "orange"], sizes: FREE, occasions: ["festive", "traditional"], collections: ["festive"], best: true, daysAgo: 30, popularity: 125,
    short: "Hand-tied Rajasthani bandhani with a gota patti border.",
    description: "Each dot of this georgette saree is hand-tied by artisans in Jamnagar. Finished with a gota patti border and tassels on the pallu — a festive classic for Teej, Karwa Chauth and mehendi." },
  { name: "Saanjh Chiffon Saree", cat: "georgette-chiffon-sarees", kind: "saree", motif: "plain", fabric: "Pure Chiffon", work: "Sequinned border", price: 6450, mrp: 7500, colours: ["black", "wine", "navy"], sizes: FREE, occasions: ["party", "office"], daysAgo: 25, popularity: 97,
    short: "Fluid pure chiffon with a fine sequinned border — your perfect evening saree.",
    description: "A minimal, fluid chiffon saree with a whisper-thin sequinned border. Pairs as easily with a tailored blouse for a cocktail as it does with a crisp shirt for a gala." },
  { name: "Kesar Chanderi Cotton Saree", cat: "cotton-linen-sarees", kind: "saree", motif: "buti", fabric: "Chanderi Silk Cotton", work: "Woven zari buttis", price: 4250, mrp: 4950, colours: ["mustard", "ivory", "sage"], sizes: FREE, occasions: ["office", "everyday", "traditional"], best: true, daysAgo: 48, popularity: 150,
    short: "Breathable Chanderi with tiny zari buttis — a work-week staple.",
    description: "Woven in Chanderi, Madhya Pradesh, this sheer silk-cotton saree carries tiny zari coin buttis and a slim gold border. Breathable and graceful for long days at work." },
  { name: "Neel Handloom Linen Saree", cat: "cotton-linen-sarees", kind: "saree", motif: "stripe", fabric: "Linen", work: "Woven stripes, tassels", price: 3950, colours: ["royal", "beige"], sizes: FREE, occasions: ["office", "everyday"], isNew: true, daysAgo: 12, popularity: 41,
    short: "Pure handloom linen with woven silver stripes and tasselled pallu.",
    description: "Crisp handloom linen woven with silver zari stripes. Softens beautifully with every wash. Comes with a contrast blouse piece." },

  // ---------------- SUITS & SETS ----------------
  { name: "Zohra Embroidered Anarkali Set", cat: "anarkali-suits", kind: "suit", motif: "jaal", fabric: "Georgette", work: "Zardozi & resham embroidery", price: 15900, mrp: 18500, colours: ["emerald", "wine"], sizes: STD, occasions: ["wedding", "festive", "party"], collections: ["festive", "bridal"], best: true, featured: true, daysAgo: 35, popularity: 172,
    short: "A 24-kali floor-length Anarkali with zardozi yoke, churidar and organza dupatta.",
    description: "Cut with twenty-four flowing kalis, the Zohra Anarkali carries a hand-embroidered zardozi yoke and a scalloped hem. Set includes the Anarkali, matching churidar and an embroidered organza dupatta. Fully lined." },
  { name: "Gulbahar Chanderi Anarkali Set", cat: "anarkali-suits", kind: "suit", motif: "buti", fabric: "Chanderi Silk", work: "Gota & mirror work", price: 9950, mrp: 11500, colours: ["blush", "mint"], sizes: STD, occasions: ["festive", "traditional"], collections: ["festive"], isNew: true, daysAgo: 4, popularity: 66,
    short: "Light Chanderi Anarkali with gota and mirror work, palazzo and dupatta.",
    description: "A pastel Chanderi Anarkali finished with gota patti and hand-set mirrors along the yoke and hem. Paired with straight palazzos and a sheer dupatta. Ideal for day festivities." },
  { name: "Ruhani Silk Straight Suit Set", cat: "straight-suits", kind: "suit", motif: "stripe", fabric: "Silk Blend", work: "Thread embroidery", price: 7450, mrp: 8500, colours: ["royal", "maroon", "teal"], sizes: STD, occasions: ["festive", "party", "office"], best: true, daysAgo: 28, popularity: 133,
    short: "A sleek straight kurta with tonal embroidery, trousers and a printed dupatta.",
    description: "A modern straight-cut silk blend kurta with tonal thread embroidery on the neckline and sleeves, paired with slim trousers and a printed silk dupatta." },
  { name: "Afreen Chikankari Suit Set", cat: "straight-suits", kind: "suit", motif: "jaal", fabric: "Georgette", work: "Lucknowi chikankari", price: 11200, mrp: 12900, colours: ["ivory", "sky", "peach"], sizes: STD, occasions: ["everyday", "festive", "traditional"], daysAgo: 60, popularity: 95,
    short: "Hand chikankari on soft georgette with a matching inner and dupatta.",
    description: "Hand-embroidered in Lucknow with over a dozen chikankari stitches — tepchi, phanda and murri among them. Includes kurta, inner slip, straight pants and a fully embroidered dupatta." },
  { name: "Mehfil Sharara Set", cat: "sharara-palazzo-sets", kind: "suit", motif: "chevron", fabric: "Crepe", work: "Sequin & dabka embroidery", price: 12450, mrp: 14500, colours: ["rani", "lilac"], sizes: STD, occasions: ["party", "wedding", "festive"], collections: ["festive"], isNew: true, best: true, daysAgo: 2, popularity: 118,
    short: "Short kurta, flared sharara and a sequinned net dupatta — made for the sangeet.",
    description: "A short embroidered kurta paired with a voluminous tiered sharara and a sequinned net dupatta. Sparkles under every light — designed to dance in." },
  { name: "Gulmohar Palazzo Set", cat: "sharara-palazzo-sets", kind: "suit", motif: "buti", fabric: "Cotton Silk", work: "Hand block print", price: 5450, mrp: 6200, colours: ["orange", "mustard"], sizes: STD, occasions: ["everyday", "festive"], daysAgo: 20, popularity: 77,
    short: "Hand block-printed kurta with palazzos and a chanderi dupatta.",
    description: "Printed by hand in Sanganer with natural dyes, this cotton silk kurta comes with relaxed palazzos and a contrast Chanderi dupatta." },
  { name: "Ira Linen Co-ord Set", cat: "co-ord-sets", kind: "kurti", motif: "plain", fabric: "Linen", work: "Pintucks", price: 4650, colours: ["sage", "beige", "black"], sizes: STD, occasions: ["office", "everyday"], isNew: true, daysAgo: 5, popularity: 52,
    short: "Pintucked linen tunic with straight trousers — polished, breathable, easy.",
    description: "A pintucked pure linen tunic with mandarin collar and wooden buttons, paired with straight trousers. A contemporary Indian co-ord for the work week." },
  { name: "Tara Satin Co-ord Set", cat: "co-ord-sets", kind: "kurti", motif: "chevron", fabric: "Modal Satin", work: "Embroidered placket", price: 5950, mrp: 6900, colours: ["wine", "emerald"], sizes: STD, occasions: ["party", "festive"], daysAgo: 16, popularity: 63,
    short: "Fluid satin kurta and flared pants with a hand-embroidered placket.",
    description: "A fluid modal-satin co-ord with a hand-embroidered placket and flared trousers — Indo-western ease for festive dinners." },

  // ---------------- LEHENGAS ----------------
  { name: "Shehzaadi Bridal Velvet Lehenga", cat: "bridal-lehengas", kind: "lehenga", motif: "jaal", fabric: "Silk Velvet", work: "Zardozi, dabka & pearl", price: 128000, mrp: 145000, colours: ["ruby", "maroon"], sizes: STD, occasions: ["wedding"], collections: ["bridal", "limited-edition"], featured: true, best: true, daysAgo: 45, popularity: 61,
    short: "Heirloom bridal lehenga in silk velvet with zardozi and pearl work, two dupattas.",
    description: "Our signature bridal piece. A 12-kali silk velvet lehenga hand-embroidered over 900 hours with zardozi, dabka and freshwater pearls. Includes a fully embroidered blouse, a net head dupatta and a velvet shoulder dupatta. Made to measure — share your measurements after purchase and our atelier will be in touch." },
  { name: "Rajkumari Bridal Lehenga", cat: "bridal-lehengas", kind: "lehenga", motif: "buti", fabric: "Raw Silk", work: "Gota patti & zari", price: 86500, mrp: 96000, colours: ["rani", "orange"], sizes: STD, occasions: ["wedding", "traditional"], collections: ["bridal"], isNew: true, daysAgo: 8, popularity: 34,
    short: "Rajputana-inspired raw silk lehenga with gota patti and a bandhani dupatta.",
    description: "Inspired by Rajputana courts, this raw silk lehenga is hand-finished with gota patti and zari, paired with a hand-tied bandhani dupatta. Made to measure." },
  { name: "Gulabo Festive Lehenga", cat: "festive-lehengas", kind: "lehenga", motif: "jaal", fabric: "Georgette", work: "Sequin & thread embroidery", price: 32900, mrp: 37500, colours: ["blush", "lilac"], sizes: STD, occasions: ["wedding", "party", "festive"], collections: ["festive", "bridal"], best: true, daysAgo: 22, popularity: 108,
    short: "Pastel georgette lehenga with tonal sequin jaal — the bridesmaid favourite.",
    description: "A flowing georgette lehenga worked with a tonal sequin and thread jaal, paired with a sweetheart-neck blouse and a scalloped dupatta. Light enough to dance in all night." },
  { name: "Chandni Mirror Work Lehenga", cat: "festive-lehengas", kind: "lehenga", motif: "chevron", fabric: "Cotton Silk", work: "Hand mirror work", price: 24500, mrp: 27900, colours: ["navy", "black"], sizes: STD, occasions: ["festive", "party", "traditional"], collections: ["festive"], isNew: true, daysAgo: 7, popularity: 49,
    short: "Kutch-inspired mirror work on deep midnight — Navratri, reimagined.",
    description: "Hand-set mirrors and Kutchi embroidery on a deep midnight cotton silk lehenga. Includes a backless blouse with tie-up tassels and a mirror-bordered dupatta." },
  { name: "Saba Organza Lehenga", cat: "lightweight-lehengas", kind: "lehenga", motif: "buti", fabric: "Organza", work: "Floral print, sequins", price: 18900, mrp: 21500, colours: ["mint", "peach"], sizes: STD, occasions: ["party", "festive", "wedding"], daysAgo: 33, popularity: 72,
    short: "Featherlight printed organza lehenga with a sequinned blouse.",
    description: "A featherlight organza lehenga in soft florals with a sequinned blouse and an organza dupatta. Can-can attached for volume, easily removable." },
  { name: "Inayat Silk Lehenga", cat: "lightweight-lehengas", kind: "lehenga", motif: "stripe", fabric: "Art Silk", work: "Woven zari", price: 14900, mrp: 16500, colours: ["teal", "mustard"], sizes: STD, occasions: ["festive", "traditional"], collections: ["festive"], daysAgo: 52, popularity: 81,
    short: "Woven zari stripes on art silk with a contrast brocade blouse.",
    description: "An easy festive lehenga with vertical woven zari stripes and a contrast brocade blouse — a timeless pick for pujas and family functions." },
  { name: "Mahira Sequin Lehenga", cat: "festive-lehengas", kind: "lehenga", motif: "jaal", fabric: "Net", work: "All-over sequins", price: 38500, mrp: 42900, colours: ["gold", "wine"], sizes: STD, occasions: ["party", "wedding"], collections: ["limited-edition"], daysAgo: 18, popularity: 69,
    short: "Shimmering all-over sequin lehenga for the reception spotlight.",
    description: "An all-over sequinned net lehenga with a structured corset blouse and a sheer sequin-edged dupatta — made for receptions and cocktail nights." },

  // ---------------- KURTIS ----------------
  { name: "Ada Chikankari Kurti", cat: "embroidered-kurtis", kind: "kurti", motif: "jaal", fabric: "Cotton Mulmul", work: "Lucknowi chikankari", price: 2850, mrp: 3290, colours: ["ivory", "sky", "blush"], sizes: STD, occasions: ["everyday", "office"], best: true, daysAgo: 38, popularity: 210,
    short: "Featherlight mulmul with hand chikankari — our best-selling everyday kurti.",
    description: "Hand-embroidered in Lucknow on breathable cotton mulmul. A straight cut with three-quarter sleeves and side slits. Wear with jeans, palazzos or a slim churidar." },
  { name: "Rooh Mirror Yoke Kurti", cat: "embroidered-kurtis", kind: "kurti", motif: "buti", fabric: "Rayon", work: "Mirror & thread work", price: 2450, mrp: 2850, colours: ["wine", "teal", "mustard"], sizes: STD, occasions: ["everyday", "festive"], isNew: true, daysAgo: 1, popularity: 37,
    short: "Flowing A-line rayon kurti with a hand mirror-work yoke.",
    description: "An A-line rayon kurti with a hand mirror-work yoke and tasselled tie-up neck. Easy, joyful and festive-ready." },
  { name: "Sanganeri Block Print Kurti", cat: "printed-kurtis", kind: "kurti", motif: "buti", fabric: "Cotton", work: "Hand block print", price: 1890, mrp: 2190, colours: ["rust", "royal", "sage"], sizes: STD, occasions: ["everyday", "office"], best: true, daysAgo: 44, popularity: 190,
    short: "Hand block-printed pure cotton with natural dyes.",
    description: "Hand block-printed in Sanganer with natural dyes on 60s pure cotton. A relaxed straight fit with a mandarin collar and pockets." },
  { name: "Leher Printed A-line Kurti", cat: "printed-kurtis", kind: "kurti", motif: "chevron", fabric: "Viscose", work: "Digital print", price: 1650, colours: ["lemon", "peach"], sizes: STD, occasions: ["everyday"], isNew: true, daysAgo: 11, popularity: 44,
    short: "Easy A-line kurti in a wave-inspired print.",
    description: "A breezy viscose A-line kurti in a wave-inspired print with a round neck and flared sleeves." },
  { name: "Aangan Kurta Set", cat: "kurta-sets", kind: "suit", motif: "buti", fabric: "Cotton", work: "Hand block print, lace", price: 3450, mrp: 3990, colours: ["blush", "mint", "lemon"], sizes: STD, occasions: ["everyday", "festive", "office"], best: true, daysAgo: 26, popularity: 158,
    short: "Kurta, pants and a mulmul dupatta in hand block-printed cotton.",
    description: "A three-piece cotton set — kurta with lace detailing, straight pants and a soft mulmul dupatta — in a delicate hand block print." },
  { name: "Kaveri Silk Kurta Set", cat: "kurta-sets", kind: "suit", motif: "stripe", fabric: "Chanderi Silk", work: "Zari yoke", price: 4950, mrp: 5600, colours: ["teal", "maroon"], sizes: STD, occasions: ["office", "festive", "traditional"], daysAgo: 19, popularity: 86,
    short: "Chanderi kurta with zari yoke, straight pants and a sheer dupatta.",
    description: "A Chanderi silk kurta with woven zari yoke, paired with straight pants and a sheer dupatta — polished enough for the office Diwali party." },

  // ---------------- BRIDAL WEAR / ACCESSORIES ----------------
  { name: "Noori Zardozi Potli Bag", cat: "bridal-accessories", kind: "potli", motif: "jaal", fabric: "Velvet", work: "Zardozi embroidery", price: 2450, mrp: 2950, colours: ["wine", "emerald", "gold"], sizes: FREE, occasions: ["wedding", "festive", "party"], collections: ["bridal", "festive"], best: true, daysAgo: 27, popularity: 140,
    short: "Hand-embroidered velvet potli with a beaded handle.",
    description: "A plush velvet potli hand-embroidered with zardozi and finished with a beaded handle and drawstring tassels. Fits a phone, lipstick and keys." },
  { name: "Kundan Bridal Necklace Set", cat: "bridal-accessories", kind: "jewel", motif: "plain", fabric: "Gold-plated brass, kundan, pearls", work: "Kundan setting", price: 8950, mrp: 10500, colours: ["rani", "emerald"], sizes: FREE, occasions: ["wedding", "traditional"], collections: ["bridal"], isNew: true, daysAgo: 10, popularity: 58,
    short: "Kundan choker with matching earrings and maang tikka.",
    description: "A gold-plated kundan choker with pearl drops, paired with matching jhumkas and a maang tikka. Nickel-free and hypoallergenic; arrives in a REWAAS keepsake box." },
  { name: "Banarasi Brocade Dupatta", cat: "dupattas", kind: "dupatta", motif: "buti", fabric: "Silk Brocade", work: "Zari weave", price: 3650, mrp: 4200, colours: ["ruby", "royal", "mustard"], sizes: FREE, occasions: ["wedding", "festive", "traditional"], collections: ["festive"], daysAgo: 36, popularity: 99,
    short: "A woven brocade dupatta to elevate any plain suit.",
    description: "A Banarasi brocade dupatta with gold buttis and a woven border. The fastest way to dress up a plain kurta set." },
  { name: "Bridal Net Head Dupatta", cat: "dupattas", kind: "dupatta", motif: "jaal", fabric: "Soft Net", work: "Scalloped zari border, sequins", price: 5450, colours: ["ruby", "blush"], sizes: FREE, occasions: ["wedding"], collections: ["bridal"], daysAgo: 50, popularity: 47,
    short: "A bridal head dupatta with scalloped zari border and personalisable lace.",
    description: "A sheer bridal net dupatta with a scalloped zari border and a scatter of sequins. Personalised lace (names or a date) available on request after purchase." },

  // ---------------- GIFT HAMPERS ----------------
  { name: "Bride-to-Be Luxe Hamper", cat: "bridal-hampers", kind: "hamper", motif: "jaal", fabric: "Gift hamper", work: "Hand-packed", price: 6950, mrp: 7900, colours: ["wine"], sizes: FREE, occasions: ["wedding"], collections: ["bridal"], best: true, featured: true, daysAgo: 21, popularity: 132,
    short: "Velvet potli, silk scrunchies, a scented candle, almond-saffron sweets and a keepsake card.",
    description: "Everything a bride needs for her countdown: a zardozi velvet potli, a set of silk scrunchies, our oudh-rose soy candle, saffron-almond barfi, a satin eye mask and a hand-lettered keepsake card. Packed in our signature wine keepsake trunk." },
  { name: "Bridesmaid Edit Hamper", cat: "bridal-hampers", kind: "hamper", motif: "buti", fabric: "Gift hamper", work: "Hand-packed", price: 3450, mrp: 3900, colours: ["blush"], sizes: FREE, occasions: ["wedding"], collections: ["bridal"], isNew: true, daysAgo: 6, popularity: 76,
    short: "A blush hamper for your favourite people — personalisable name card included.",
    description: "A thank-you for the girls who've had your back: a mirror-work pouch, a mini candle, rose-pistachio chocolates, a satin scrunchie and a personalised name card. Order in sets for the whole squad." },
  { name: "Diwali Diya & Mithai Hamper", cat: "festive-hampers", kind: "hamper", motif: "chevron", fabric: "Gift hamper", work: "Hand-packed", price: 2950, mrp: 3400, colours: ["mustard"], sizes: FREE, occasions: ["festive", "traditional"], collections: ["festive"], best: true, daysAgo: 14, popularity: 166,
    short: "Hand-painted diyas, artisanal mithai, dry fruits and a brass urli.",
    description: "Celebrate the festival of lights with hand-painted terracotta diyas, a small brass urli, artisanal kaju katli, roasted dry fruits and a kesar-infused candle — packed in a gold-foiled festive box." },
  { name: "Anniversary Keepsake Hamper", cat: "celebration-hampers", kind: "hamper", motif: "buti", fabric: "Gift hamper", work: "Hand-packed", price: 4450, colours: ["ruby"], sizes: FREE, occasions: ["party"], daysAgo: 29, popularity: 54,
    short: "A silk stole, two candles, premium chocolates and a personalised note.",
    description: "Mark the years with a hand-woven silk stole, a pair of rose-oudh candles, premium couverture chocolates and a personalised calligraphy note." },
  { name: "Birthday Blossom Hamper", cat: "celebration-hampers", kind: "hamper", motif: "jaal", fabric: "Gift hamper", work: "Hand-packed", price: 2650, colours: ["peach"], sizes: FREE, occasions: ["party", "everyday"], isNew: true, daysAgo: 5, popularity: 39,
    short: "Block-printed pouch, mini candle, cookies and a birthday card.",
    description: "A cheerful hamper with a block-printed vanity pouch, a mini jasmine candle, handmade cookies, a scrunchie and a hand-lettered birthday card." },
  { name: "Corporate Signature Hamper", cat: "corporate-gifts", kind: "hamper", motif: "stripe", fabric: "Gift hamper", work: "Hand-packed, logo card", price: 3850, colours: ["navy"], sizes: FREE, occasions: ["festive", "office"], daysAgo: 31, popularity: 90,
    short: "Premium dry fruits, a brass diya, a candle and a co-branded card. Bulk pricing available.",
    description: "Elegant gifting for teams and clients: premium dry fruits, a polished brass diya, a soy candle and a co-branded greeting card. Bulk and logo customisation available — contact our gifting desk for orders above 25 units." },
  { name: "Shagun Return Gift Potli (Set of 10)", cat: "wedding-return-gifts", kind: "potli", motif: "buti", fabric: "Brocade", work: "Hand-finished", price: 4950, mrp: 5500, colours: ["rani", "mustard"], sizes: FREE, occasions: ["wedding", "traditional"], collections: ["bridal"], daysAgo: 24, popularity: 71,
    short: "Ten brocade potlis with almonds, mishri and a thank-you tag.",
    description: "Set of ten brocade potlis filled with California almonds and mishri, each finished with a personalised thank-you tag. Perfect as wedding return gifts." },
];

export const HAMPER_BOXES = [
  { name: "The Petite Box", description: "A compact ivory keepsake box with a gold-foiled REWAAS lid.", price: 49900, capacity: 4, dimensions: "25 × 20 × 10 cm", colour: "#EFE6D4", stock: 120 },
  { name: "The Signature Trunk", description: "Our wine-velvet trunk with brass clasp — keep it long after the gifts are gone.", price: 119900, capacity: 7, dimensions: "35 × 25 × 15 cm", colour: "#5E1A2E", stock: 60 },
  { name: "The Heritage Basket", description: "A hand-woven cane basket lined with silk, for generous gifting.", price: 89900, capacity: 10, dimensions: "40 × 30 × 18 cm", colour: "#A9824B", stock: 40 },
];

export const HAMPER_COMPONENTS: { name: string; description: string; group: string; price: number; shape: "candle" | "box" | "jar" | "bottle" | "fabric" | "jewel" | "card" | "potli"; colour: string; max?: number }[] = [
  { name: "Silk Stole", description: "Hand-woven silk stole, 200 × 70 cm", group: "Apparel & Textiles", price: 189000, shape: "fabric", colour: "#9B1B30" },
  { name: "Chikankari Dupatta", description: "Hand-embroidered mulmul dupatta", group: "Apparel & Textiles", price: 149000, shape: "fabric", colour: "#EFE6D4" },
  { name: "Satin Scrunchie Trio", description: "Three mulberry-satin scrunchies", group: "Apparel & Textiles", price: 49000, shape: "fabric", colour: "#E3A6A9" },
  { name: "Zardozi Velvet Potli", description: "Hand-embroidered potli bag", group: "Accessories", price: 189000, shape: "potli", colour: "#5E1A2E", max: 2 },
  { name: "Kundan Jhumkas", description: "Gold-plated kundan earrings", group: "Accessories", price: 129000, shape: "jewel", colour: "#C2185B", max: 2 },
  { name: "Mirror-work Pouch", description: "Hand mirror-work vanity pouch", group: "Accessories", price: 69000, shape: "potli", colour: "#1E5F66" },
  { name: "Oudh & Rose Candle", description: "Hand-poured soy wax, 40-hour burn", group: "Home & Fragrance", price: 89000, shape: "candle", colour: "#5E1A2E" },
  { name: "Jasmine Mini Candle", description: "Soy wax in a brass votive", group: "Home & Fragrance", price: 49000, shape: "candle", colour: "#EFE6D4" },
  { name: "Brass Diya Pair", description: "Polished brass diyas", group: "Home & Fragrance", price: 79000, shape: "box", colour: "#B8914F" },
  { name: "Saffron Almond Barfi", description: "250 g artisanal mithai", group: "Sweets & Treats", price: 59000, shape: "jar", colour: "#C9962B" },
  { name: "Rose Pistachio Chocolates", description: "Box of 9 couverture bonbons", group: "Sweets & Treats", price: 79000, shape: "box", colour: "#A3215F" },
  { name: "Roasted Dry Fruit Jar", description: "300 g almonds, cashews & pistachios", group: "Sweets & Treats", price: 99000, shape: "jar", colour: "#A0482B" },
  { name: "Kumkumadi Face Oil", description: "Ayurvedic radiance oil, 30 ml", group: "Beauty & Wellness", price: 119000, shape: "bottle", colour: "#D9733B" },
  { name: "Rose Water Mist", description: "Steam-distilled Kannauj rose, 100 ml", group: "Beauty & Wellness", price: 45000, shape: "bottle", colour: "#E3A6A9" },
  { name: "Hand-lettered Card", description: "Calligraphy card with your message", group: "Finishing Touches", price: 19900, shape: "card", colour: "#5E1A2E", max: 1 },
];

export const PACKAGING = [
  { name: "Classic REWAAS Wrap", description: "Ivory tissue, wine satin ribbon and wax seal.", price: 0 },
  { name: "Floral Luxe Wrap", description: "Dried-flower garnish, gold-foiled tag and silk ribbon.", price: 29900 },
  { name: "Eco Jute Wrap", description: "Hand-loomed jute wrap with a reusable cotton bag.", price: 14900 },
];
