import type { Metadata } from "next";
import Link from "next/link";
import Img from "@/components/Img";
import ProductCard from "@/components/ProductCard";
import SectionHeading from "@/components/SectionHeading";
import { GiftIcon, SparkIcon, TruckIcon } from "@/components/icons";
import { productsFor } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Gift Studio — Luxury Gift Hampers & Create Your Own",
  description: "Bridal, bridesmaid, festive, birthday, anniversary and corporate gift hampers — or create your own personalised REWAAS hamper with a handwritten note.",
  alternates: { canonical: "/gift-studio" },
};

const OCCASIONS = [
  { label: "Saree Gift Combos", href: "/collections/gift-combos?q=saree", image: "/photos/combo-kanjeevaram-shagun.jpg", line: "A saree, jewellery & treats, boxed" },
  { label: "Suit Gift Combos", href: "/collections/gift-combos?q=suit", image: "/photos/combo-anarkali-kundan.jpg", line: "A suit with matching jewellery" },
  { label: "Bridal Trousseau Boxes", href: "/collections/gift-combos?occasion=wedding", image: "/photos/combo-grand-trousseau.jpg", line: "Saree, suit & bridal jewellery" },
  { label: "Festive Saree Combos", href: "/products/festive-chanderi-saree-combo", image: "/photos/combo-festive-chanderi-saree.jpg", line: "Saree, diyas & mithai for Diwali" },
  { label: "Bridal Gift Hampers", href: "/collections/bridal-hampers", image: "/photos/p-bride-to-be-luxe-hamper.jpg", line: "For the bride-to-be's countdown" },
  { label: "Bridesmaid Hampers", href: "/products/bridesmaid-edit-hamper", image: "/photos/p-bridesmaid-edit-hamper.jpg", line: "Thank the girls who stood by you" },
  { label: "Wedding Return Gifts", href: "/collections/wedding-return-gifts", image: "/photos/p-shagun-return-gift-potli-set-of-10.jpg", line: "Shagun potlis for every guest" },
  { label: "Festive Gift Hampers", href: "/collections/festive-hampers", image: "/photos/p-diwali-diya-and-mithai-hamper.jpg", line: "Diwali, Rakhi, Eid & more" },
  { label: "Birthday Hampers", href: "/products/birthday-blossom-hamper", image: "/photos/p-birthday-blossom-hamper.jpg", line: "A little joy, beautifully boxed" },
  { label: "Anniversary Gifts", href: "/products/anniversary-keepsake-hamper", image: "/photos/p-anniversary-keepsake-hamper.jpg", line: "For the years, and the ones ahead" },
  { label: "Corporate Gifts", href: "/collections/corporate-gifts", image: "/photos/p-corporate-signature-hamper.jpg", line: "Co-branded, bulk-ready" },
  { label: "Personalised Hampers", href: "/gift-studio/create", image: "/photos/gift-studio.jpg", line: "Compose your own, piece by piece" },
];

export default async function GiftStudioPage() {
  const [hampers, combos] = await Promise.all([
    productsFor({ category: { parent: { slug: "gift-hampers" } }, NOT: { collections: { has: "gift-combo" } } }, 8, [{ popularity: "desc" }]),
    productsFor({ collections: { has: "gift-combo" } }, 8, [{ isFeatured: "desc" }, { popularity: "desc" }]),
  ]);
  return (
    <>
      <section className="relative overflow-hidden bg-ivory-200">
        <div className="container-site grid items-center gap-10 py-12 lg:grid-cols-2 lg:py-0">
          <div className="lg:py-24">
            <p className="eyebrow animate-fadeUp">REWAAS Gift Studio</p>
            <h1 className="h-display mt-4 animate-fadeUp text-balance [animation-delay:100ms]">Gifts, thoughtfully composed.</h1>
            <p className="lead mt-5 max-w-md animate-fadeUp [animation-delay:200ms]">In Indian homes, a gift carries a blessing. Choose a curated hamper, or build your own — with a keepsake box, treasures you pick, a handwritten note and signature wrapping.</p>
            <div className="mt-8 flex animate-fadeUp flex-wrap gap-3 [animation-delay:300ms]">
              <Link href="/gift-studio/create" className="btn-primary">Create Your Own Hamper</Link>
              <Link href="#curated" className="btn-outline">Shop Curated Hampers</Link>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden lg:aspect-auto lg:h-[620px]">
            <Img src="/photos/gift-studio.jpg" alt="A REWAAS hamper being composed" fill priority sizes="(min-width:1024px) 50vw, 100vw" className="animate-[heroZoom_9s_ease-out_both] object-cover" />
          </div>
        </div>
      </section>

      <section className="container-site py-20 lg:py-28">
        <SectionHeading eyebrow="Gifting for Every Moment" title="Find the Perfect Gift" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-6">
          {OCCASIONS.map((o) => (
            <Link key={o.label} href={o.href} className="group block">
              <div className="relative aspect-[4/5] overflow-hidden bg-ivory-200"><Img src={o.image} alt={o.label} fill sizes="(min-width:768px) 25vw, 50vw" className="img-zoom object-cover" /></div>
              <h3 className="mt-3 font-display text-xl group-hover:text-wine">{o.label}</h3>
              <p className="text-xs text-ink-400">{o.line}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-wine-700 text-ivory">
        <div className="container-site grid gap-12 py-20 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-gold-300">Create Your Own Hamper</p>
            <h2 className="h-section mt-3 text-ivory">Four steps to a gift they&apos;ll keep forever.</h2>
            <Link href="/gift-studio/create" className="btn-light mt-8">Start Creating</Link>
          </div>
          <ol className="grid gap-px bg-ivory/15 sm:grid-cols-2">
            {[["Choose a box", "Petite keepsake box, velvet trunk or hand-woven basket."], ["Fill it", "Silk stoles, potlis, jewellery, candles, mithai and more."], ["Personalise", "A handwritten note with your message and names."], ["Wrap it", "Classic, floral luxe or eco jute — and we ship it to them."]].map(([t, d], i) => (
              <li key={t} className="bg-wine-700 p-7"><span className="font-display text-4xl text-gold-300">0{i + 1}</span><p className="mt-3 font-display text-2xl">{t}</p><p className="mt-2 text-sm text-ivory/70">{d}</p></li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-ivory-200/70 py-20 lg:py-28">
        <div className="container-site">
          <SectionHeading align="left" eyebrow="Saree · Suit · Jewellery" title="Perfect Gift Combos" text="Complete looks — a saree or suit with matching jewellery and treats — boxed and ready to give." href="/collections/gift-combos" linkLabel="Shop all combos" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 lg:gap-x-6">{combos.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        </div>
      </section>

      <section id="curated" className="container-site scroll-mt-28 py-20 lg:py-28">
        <SectionHeading align="left" eyebrow="Ready to Gift" title="Curated Hampers" href="/collections/gift-hampers" linkLabel="Shop all hampers" />
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 lg:gap-x-6">{hampers.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      </section>

      <section className="container-site pb-8">
        <div className="grid gap-6 bg-ivory-200 p-8 sm:p-12 md:grid-cols-3">
          {[[GiftIcon, "Signature packaging", "Every hamper arrives hand-wrapped, with a wax seal and no price tags."], [TruckIcon, "Ship to them directly", "Add their address at checkout — we'll include your note."], [SparkIcon, "Corporate & bulk", "Co-branded cards and volume pricing from 25 hampers. Write to gifting@rewaas.com."]].map(([I, t, d]) => {
            const Icon = I as typeof GiftIcon;
            return <div key={t as string}><Icon size={26} className="text-gold-600" /><p className="mt-3 font-display text-xl">{t as string}</p><p className="mt-1 text-sm text-ink-400">{d as string}</p></div>;
          })}
        </div>
      </section>
    </>
  );
}
