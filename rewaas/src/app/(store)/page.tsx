import Link from "next/link";
import Img from "@/components/Img";
import ProductCard from "@/components/ProductCard";
import SectionHeading from "@/components/SectionHeading";
import Newsletter from "@/components/Newsletter";
import Reveal from "@/components/Reveal";
import Marquee from "@/components/Marquee";
import HeroCarousel from "@/components/home/HeroCarousel";
import BestSellers from "@/components/home/BestSellers";
import { InstagramIcon, StarIcon, ArrowRight } from "@/components/icons";
import { db } from "@/lib/db";
import { productsFor } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { SITE_URL, jsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

const OCCASIONS = [
  { slug: "wedding", label: "Wedding Wear", line: "For the vows, the pheras and every ritual between" },
  { slug: "festive", label: "Festive Wear", line: "Diwali, Eid, Teej & every celebration" },
  { slug: "party", label: "Party Wear", line: "Sangeet nights and cocktail evenings" },
  { slug: "everyday", label: "Everyday Wear", line: "Easy, breathable, beautifully made" },
  { slug: "office", label: "Office Wear", line: "Polished silhouettes for the work week" },
  { slug: "traditional", label: "Traditional Occasions", line: "Pujas, temple visits & family rituals" },
];

const BRIDAL = [
  { label: "Bridal Sarees", href: "/collections/kanjeevaram-sarees", image: "/photos/p-meenakshi-kanjeevaram-silk-saree.jpg" },
  { label: "Designer Lehengas", href: "/collections/bridal-lehengas", image: "/photos/p-shehzaadi-bridal-velvet-lehenga.jpg" },
  { label: "Wedding Suits", href: "/collections/anarkali-suits", image: "/photos/p-zohra-embroidered-anarkali-set.jpg" },
  { label: "Bridal Accessories", href: "/collections/bridal-accessories", image: "/photos/p-kundan-bridal-necklace-set.jpg" },
  { label: "Bride-to-Be Hampers", href: "/collections/bridal-hampers", image: "/photos/p-bride-to-be-luxe-hamper.jpg" },
  { label: "Bridesmaid Gifts", href: "/products/bridesmaid-edit-hamper", image: "/photos/p-bridesmaid-edit-hamper.jpg" },
];

const GIFTING = [
  { label: "Saree & Suit Combos", href: "/collections/gift-combos", image: "/photos/combo-kanjeevaram-shagun.jpg" },
  { label: "Bridal Gift Hampers", href: "/collections/bridal-hampers", image: "/photos/p-bride-to-be-luxe-hamper.jpg" },
  { label: "Bridesmaid Hampers", href: "/products/bridesmaid-edit-hamper", image: "/photos/p-bridesmaid-edit-hamper.jpg" },
  { label: "Wedding Return Gifts", href: "/collections/wedding-return-gifts", image: "/photos/p-shagun-return-gift-potli-set-of-10.jpg" },
  { label: "Festive Gift Hampers", href: "/collections/festive-hampers", image: "/photos/p-diwali-diya-and-mithai-hamper.jpg" },
  { label: "Birthday Hampers", href: "/products/birthday-blossom-hamper", image: "/photos/p-birthday-blossom-hamper.jpg" },
  { label: "Anniversary Gifts", href: "/products/anniversary-keepsake-hamper", image: "/photos/p-anniversary-keepsake-hamper.jpg" },
  { label: "Personalised Hampers", href: "/gift-studio/create", image: "/photos/gift-studio.jpg" },
];

const INSTA = [
  "/photos/insta-1.jpg", "/photos/p-gulabo-festive-lehenga.jpg", "/photos/insta-2.jpg", "/photos/occ-festive.jpg",
  "/photos/insta-3.jpg", "/photos/p-noori-zardozi-potli-bag.jpg", "/photos/insta-4.jpg", "/photos/occ-traditional.jpg",
];

export default async function HomePage() {
  const [banners, categories, newArrivals, testimonials, settings, ...best] = await Promise.all([
    db.banner.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.category.findMany({ where: { parentId: null, showOnHome: true }, orderBy: { sortOrder: "asc" } }),
    productsFor({ isNew: true }, 8, [{ createdAt: "desc" }]),
    db.testimonial.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, take: 6 }),
    getSettings(),
    productsFor({ isBestseller: true }, 8, [{ popularity: "desc" }]),
    productsFor({ isBestseller: true, category: { parent: { slug: "sarees" } } }, 4, [{ popularity: "desc" }]),
    productsFor({ OR: [{ category: { parent: { slug: "suits-sets" } } }, { category: { parent: { slug: "kurtis" } } }], isBestseller: true }, 4, [{ popularity: "desc" }]),
    productsFor({ category: { parent: { slug: "lehengas" } } }, 4, [{ popularity: "desc" }]),
    productsFor({ category: { parent: { slug: "gift-hampers" } } }, 4, [{ popularity: "desc" }]),
    productsFor({ collections: { has: "gift-combo" } }, 4, [{ isFeatured: "desc" }, { popularity: "desc" }]),
  ]);
  const combos = best[5];
  const hero = banners.filter((b) => b.placement === "hero");
  const featured = banners.find((b) => b.placement === "featured");
  const tabs = [
    { key: "all", label: "All", href: "/collections/best-sellers", products: best[0] },
    { key: "sarees", label: "Sarees", href: "/collections/sarees?sort=popular", products: best[1] },
    { key: "suits", label: "Suits & Kurtis", href: "/collections/suits-sets?sort=popular", products: best[2] },
    { key: "lehengas", label: "Lehengas", href: "/collections/lehengas?sort=popular", products: best[3] },
    { key: "hampers", label: "Gift Hampers", href: "/collections/gift-hampers?sort=popular", products: best[4] },
  ].filter((t) => t.products.length);

  const org = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", name: "REWAAS", url: SITE_URL, logo: `${SITE_URL}/favicon.svg`, slogan: "The Beauty of Being You.", sameAs: [settings.instagramUrl, settings.facebookUrl, settings.pinterestUrl, settings.youtubeUrl],
        contactPoint: { "@type": "ContactPoint", telephone: settings.supportPhone, email: settings.supportEmail, contactType: "customer service", areaServed: "IN", availableLanguage: ["en", "hi"] } },
      { "@type": "WebSite", name: "REWAAS", url: SITE_URL, potentialAction: { "@type": "SearchAction", target: `${SITE_URL}/search?q={search_term_string}`, "query-input": "required name=search_term_string" } },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(org)} />

      {/* 2 — Hero */}
      <HeroCarousel slides={hero} />
      <Marquee items={["Handwoven in Varanasi", "Chikankari from Lucknow", "Kanjeevaram from Kanchipuram", "Bandhani from Jamnagar", "Block prints from Sanganer", "Complimentary shipping above ₹1,999", "Easy 7-day exchanges", "Gift-wrapped by hand"]} />

      {/* 3 — Shop by Category */}
      <section className="container-site py-20 lg:py-28">
        <SectionHeading eyebrow="The REWAAS Wardrobe" title="Shop by Category" text="Six chapters of Indian craft — each one woven, embroidered and finished by hand." />
        <Reveal stagger className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
          {categories.map((c, i) => (
            <Link key={c.id} href={`/collections/${c.slug}`} className={`group relative block overflow-hidden bg-ivory-200 ${i === 0 || i === 5 ? "lg:row-span-1" : ""} aspect-[4/5]`}>
              {c.image && <Img src={c.image} alt={c.name} fill sizes="(min-width:1024px) 33vw, 50vw" className="img-zoom object-cover" />}
              <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/5 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-ivory sm:p-7">
                <h3 className="font-display text-2xl sm:text-[2rem]">{c.name}</h3>
                <span className="mt-2 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-ivory/85 transition group-hover:gap-3 sm:text-[11px]">Shop Now <ArrowRight size={14} /></span>
              </div>
            </Link>
          ))}
        </Reveal>
      </section>

      {/* 4 — New Arrivals */}
      <section className="bg-white/60 py-20 lg:py-28">
        <div className="container-site">
          <SectionHeading align="left" eyebrow="Just Arrived" title="New Arrivals" text="Fresh from our looms and ateliers — the newest pieces to join REWAAS." href="/collections/new-arrivals" linkLabel="Shop all new arrivals" />
          <Reveal stagger className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 lg:gap-x-6">
            {newArrivals.map((p, i) => <ProductCard key={p.id} p={p} priority={i < 4} />)}
          </Reveal>
        </div>
      </section>

      {/* 5 — Best Sellers */}
      <section className="container-site py-20 lg:py-28">
        <SectionHeading eyebrow="Most Loved" title="Best Sellers" text="The pieces our clients return to — again and again." />
        <BestSellers tabs={tabs} />
      </section>

      {/* 6 — Shop by Occasion */}
      <section className="bg-ivory-200/70 py-20 lg:py-28">
        <div className="container-site">
          <SectionHeading align="left" eyebrow="Dress for the Moment" title="Shop by Occasion" href="/collections/all" linkLabel="Explore everything" />
        </div>
        <div className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 sm:px-6 lg:grid lg:grid-cols-6 lg:gap-5 lg:overflow-visible lg:px-10 xl:mx-auto xl:max-w-site">
          {OCCASIONS.map((o) => (
            <Link key={o.slug} href={`/collections/all?occasion=${o.slug}`} className="group w-[68vw] shrink-0 snap-start sm:w-[40vw] lg:w-auto">
              <div className="relative aspect-[3/4] overflow-hidden bg-ivory-300">
                <Img src={`/photos/occ-${o.slug}.jpg`} alt={o.label} fill sizes="(min-width:1024px) 16vw, 68vw" className="img-zoom object-cover" />
              </div>
              <h3 className="mt-4 font-display text-xl group-hover:text-wine">{o.label}</h3>
              <p className="mt-1 text-xs leading-relaxed text-ink-400">{o.line}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* 7 — The Bridal Edit */}
      <section className="py-20 lg:py-28">
        <div className="container-site grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
          <Reveal className="relative lg:col-span-5">
            <div className="relative aspect-[4/5] overflow-hidden">
              <Img src="/photos/bridal-edit.jpg" alt="A REWAAS bride in a velvet zardozi lehenga" fill sizes="(min-width:1024px) 40vw, 100vw" className="object-cover" />
            </div>
            <div className="absolute -bottom-6 -right-2 hidden bg-wine px-8 py-6 text-ivory sm:block lg:-right-10">
              <p className="font-display text-4xl">900+</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-gold-300">hours of handwork<br />in every bridal lehenga</p>
            </div>
          </Reveal>
          <Reveal className="lg:col-span-7" delay={150}>
            <p className="eyebrow mb-3">The Bridal Edit</p>
            <h2 className="h-section text-balance">For the day you&apos;ve always imagined.</h2>
            <p className="lead mt-5 max-w-xl">From the first fitting to the final phera — heirloom lehengas, Kanjeevaram silks and finishing pieces, made by master karigars and styled by our bridal team. Book a private video consultation and we&apos;ll compose your entire trousseau with you.</p>
            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              {BRIDAL.map((b) => (
                <Link key={b.label} href={b.href} className="group relative block aspect-square overflow-hidden bg-ivory-200">
                  <Img src={b.image} alt={b.label} fill sizes="(min-width:1024px) 18vw, 45vw" className="img-zoom object-cover object-top" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
                  <span className="absolute bottom-3 left-3 right-3 font-display text-[17px] leading-tight text-ivory sm:text-lg">{b.label}</span>
                </Link>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/collections/bridal" className="btn-primary">Explore the Bridal Edit</Link>
              <Link href="/pages/contact" className="btn-outline">Book a Bridal Consultation</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 8 — REWAAS Gift Studio */}
      <section className="relative overflow-hidden bg-wine-700 text-ivory">
        <div className="container-site grid gap-12 py-20 lg:grid-cols-12 lg:py-28">
          <Reveal className="lg:col-span-5">
            <p className="text-[11px] uppercase tracking-[0.32em] text-gold-300">REWAAS Gift Studio</p>
            <h2 className="h-section mt-3 text-balance text-ivory">Gifts, thoughtfully composed.</h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ivory/75">In Indian homes, a gift is a language. Choose one of our curated hampers — or compose your own, piece by piece, with a handwritten note and signature wrapping.</p>
            <div className="mt-10 border border-gold/40 p-6 sm:p-8">
              <p className="font-display text-2xl text-gold-300">Create Your Own Hamper</p>
              <ol className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-ivory/80">
                {["Choose a keepsake box", "Fill it with treasures", "Add a personal note", "Pick your wrapping"].map((s, i) => (
                  <li key={s} className="flex gap-3"><span className="font-display text-lg leading-none text-gold-300">0{i + 1}</span>{s}</li>
                ))}
              </ol>
              <Link href="/gift-studio/create" className="btn-light mt-7 w-full sm:w-auto">Start Creating</Link>
            </div>
          </Reveal>
          <Reveal stagger className="grid grid-cols-2 content-center gap-3 sm:grid-cols-4 lg:col-span-7">
            {GIFTING.map((g) => (
              <Link key={g.label} href={g.href} className="group relative block aspect-[4/5] overflow-hidden bg-wine-800">
                <Img src={g.image} alt={g.label} fill sizes="(min-width:1024px) 22vw, 45vw" className="img-zoom object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-wine-900/80 via-transparent" />
                <span className="absolute bottom-3 left-3 right-3 font-display text-[17px] leading-tight sm:text-lg">{g.label}</span>
              </Link>
            ))}
          </Reveal>
        </div>
      </section>

      {/* 8b — Perfect Gift Combos */}
      {combos.length > 0 && (
        <section className="bg-ivory-200/70 py-20 lg:py-28">
          <div className="container-site">
            <SectionHeading eyebrow="Ready to Gift" title="Perfect Gift Combos" text="A saree or suit, matching jewellery and a few indulgences — one complete look, beautifully boxed and ready to give." />
            <Reveal className="-mt-4 mb-10 flex flex-wrap justify-center gap-2">
              {[["Saree Combos", "/collections/gift-combos?q=saree"], ["Suit Combos", "/collections/gift-combos?q=suit"], ["Bridal Trousseau", "/collections/gift-combos?occasion=wedding"], ["Festive Gifting", "/collections/gift-combos?occasion=festive"], ["Build Your Own", "/gift-studio/create"]].map(([l, h]) => (
                <Link key={l} href={h} className="chip px-4 py-2 text-[11px] uppercase tracking-[0.14em]">{l}</Link>
              ))}
            </Reveal>
            <Reveal stagger className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 lg:gap-x-6">
              {combos.map((p) => <ProductCard key={p.id} p={p} />)}
            </Reveal>
            <div className="mt-12 text-center"><Link href="/collections/gift-combos" className="btn-primary">Shop all gift combos</Link></div>
          </div>
        </section>
      )}

      {/* 9 — Featured Collection */}
      {featured && (
        <section className="relative h-[78vh] max-h-[760px] min-h-[520px] overflow-hidden">
          <Img src={featured.mobileImage ?? featured.desktopImage} alt={featured.title} fill sizes="100vw" className="object-cover md:hidden" />
          <Img src={featured.desktopImage} alt={featured.title} fill sizes="100vw" className="hidden object-cover md:block" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-ink/10" />
          <Reveal className="container-site relative flex h-full flex-col items-center justify-end pb-16 text-center text-ivory">
            {featured.eyebrow && <p className="text-[11px] uppercase tracking-[0.34em] text-gold-300">{featured.eyebrow}</p>}
            <h2 className="mt-3 font-display text-5xl sm:text-7xl">{featured.title}</h2>
            {featured.subtitle && <p className="mt-4 max-w-lg text-[15px] text-ivory/80">{featured.subtitle}</p>}
            {featured.ctaHref && <Link href={featured.ctaHref} className="btn-ghost-light mt-8">{featured.ctaLabel ?? "Discover"}</Link>}
          </Reveal>
        </section>
      )}

      {/* 10 — Customer Reviews (only real testimonials added in Admin → Testimonials) */}
      {testimonials.length > 0 && <section className="py-20 lg:py-28">
        <div className="container-site">
          <SectionHeading eyebrow="Loved by Our Clients" title="Worn, Gifted & Treasured" text="Words from the women who wear and gift REWAAS." />
        </div>
        <div className="no-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 sm:px-6 lg:mx-auto lg:grid lg:max-w-site lg:grid-cols-3 lg:overflow-visible lg:px-10">
          {testimonials.slice(0, 3).concat(testimonials.slice(3)).map((t, i) => (
            <figure key={t.id} className={`card flex w-[85vw] shrink-0 snap-start flex-col sm:w-[60vw] lg:w-auto ${i > 2 ? "lg:hidden" : ""}`}>
              {t.image && (
                <div className="relative aspect-[16/10] overflow-hidden bg-ivory-200">
                  <Img src={t.image} alt={`${t.name} wearing ${t.productName}`} fill sizes="(min-width:1024px) 30vw, 85vw" className="object-cover object-top" />
                  <span className="absolute bottom-3 left-3 bg-ivory/95 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-ink-400">Customer photo</span>
                </div>
              )}
              <div className="flex flex-1 flex-col p-6 sm:p-7">
                <div className="flex gap-0.5 text-gold" aria-label={`${t.rating} out of 5 stars`}>{Array.from({ length: 5 }, (_, k) => <StarIcon key={k} size={15} filled={k < t.rating} />)}</div>
                <blockquote className="mt-4 flex-1 font-display text-[19px] leading-relaxed text-ink">“{t.text}”</blockquote>
                <figcaption className="mt-6 border-t border-ink-200/60 pt-4 text-sm">
                  <span className="font-medium">{t.name}</span><span className="text-ink-400"> · {t.city}</span>
                  <p className="mt-0.5 text-xs text-ink-400">Purchased: {t.productSlug ? <Link href={`/products/${t.productSlug}`} className="text-wine hover:underline">{t.productName}</Link> : t.productName}</p>
                </figcaption>
              </div>
            </figure>
          ))}
        </div>
      </section>}

      {/* 11 — Instagram */}
      <section className="pb-20 lg:pb-28">
        <div className="container-site">
          <SectionHeading eyebrow={`@${settings.instagramHandle}`} title="Styled by You" text="Tag #WearREWAAS to be featured — our favourite way to see the pieces we make come alive." />
        </div>
        <Reveal stagger className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-8">
          {INSTA.map((src, i) => (
            <a key={src} href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="group relative block aspect-square overflow-hidden bg-ivory-200" aria-label={`Instagram post ${i + 1}`}>
              <Img src={src} alt="" fill sizes="(min-width:1024px) 12.5vw, 50vw" className="img-zoom object-cover object-top" />
              <div className="absolute inset-0 flex items-center justify-center bg-wine/0 text-ivory opacity-0 transition duration-500 group-hover:bg-wine/45 group-hover:opacity-100"><InstagramIcon size={28} /></div>
            </a>
          ))}
        </Reveal>
      </section>

      {/* 12 — Newsletter */}
      <section className="container-site">
        <div className="relative overflow-hidden bg-ivory-200 px-6 py-16 text-center sm:px-16 lg:py-20">
          <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full border border-gold/30" />
          <div className="pointer-events-none absolute -bottom-20 -right-10 h-72 w-72 rounded-full border border-gold/25" />
          <p className="eyebrow">The REWAAS Letter</p>
          <h2 className="h-section mt-3">Be the First to Discover.</h2>
          <p className="lead mx-auto mt-3 max-w-lg">New collections, private previews, styling notes and festive gifting guides — delivered gracefully, never too often.</p>
          <div className="mx-auto mt-8 max-w-md"><Newsletter source="home" /></div>
        </div>
      </section>
    </>
  );
}
