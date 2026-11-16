import Link from "next/link";
import Newsletter from "@/components/Newsletter";
import { FacebookIcon, InstagramIcon, PinterestIcon, ReturnIcon, ShieldIcon, TruckIcon, WhatsAppIcon, YoutubeIcon, GiftIcon } from "@/components/icons";
import { getSettings } from "@/lib/settings";

const cols = [
  { title: "Our Collections", links: [["Sarees", "/collections/sarees"], ["Suits & Sets", "/collections/suits-sets"], ["Lehengas", "/collections/lehengas"], ["Kurtis", "/collections/kurtis"], ["Bridal Collection", "/collections/bridal"], ["Festive Collection", "/collections/festive"], ["New Arrivals", "/collections/new-arrivals"]] },
  { title: "Gift Studio", links: [["Gift Hampers", "/collections/gift-hampers"], ["Create Your Own Hamper", "/gift-studio/create"], ["Bridal & Bridesmaid", "/collections/bridal-hampers"], ["Corporate Gifting", "/collections/corporate-gifts"], ["Wedding Return Gifts", "/collections/wedding-return-gifts"]] },
  { title: "Client Care", links: [["Contact Us", "/pages/contact"], ["Track Your Order", "/track-order"], ["Shipping Policy", "/pages/shipping-policy"], ["Return & Exchange Policy", "/pages/returns-exchanges"], ["FAQs", "/pages/faqs"], ["My Account", "/account"]] },
  { title: "REWAAS", links: [["About REWAAS", "/pages/about"], ["Privacy Policy", "/pages/privacy-policy"], ["Terms & Conditions", "/pages/terms"]] },
];

export default async function Footer() {
  const s = await getSettings();
  return (
    <footer className="mt-24 bg-wine-900 text-ivory/85">
      <div className="border-b border-ivory/10">
        <div className="container-site grid grid-cols-2 gap-6 py-8 text-center text-[11px] uppercase tracking-[0.16em] md:grid-cols-4">
          {[[TruckIcon, "Complimentary shipping above ₹1,999"], [ReturnIcon, "Easy 7-day exchanges"], [ShieldIcon, "Secure Razorpay payments"], [GiftIcon, "Signature gift packaging"]].map(([I, t]) => {
            const Icon = I as typeof TruckIcon;
            return <div key={t as string} className="flex flex-col items-center gap-2.5"><Icon size={22} className="text-gold-300" /><span>{t as string}</span></div>;
          })}
        </div>
      </div>
      <div className="container-site grid gap-12 py-16 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="font-display text-3xl tracking-[0.3em] text-ivory">REWAAS</p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.4em] text-gold-300">The Beauty of Being You</p>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-ivory/65">Premium Indian ethnic wear, contemporary fashion and luxury gifting — handcrafted with artisans across India.</p>
          <div className="mt-8 max-w-sm">
            <p className="mb-1 font-display text-xl text-ivory">Be the First to Discover.</p>
            <Newsletter source="footer" dark />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4 lg:col-span-8">
          {cols.map((c) => (
            <div key={c.title}>
              <p className="mb-4 text-[11px] uppercase tracking-[0.2em] text-gold-300">{c.title}</p>
              <ul className="space-y-2.5 text-sm">
                {c.links.map(([l, h]) => <li key={h}><Link href={h} className="text-ivory/70 transition hover:text-ivory">{l}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-ivory/10">
        <div className="container-site flex flex-col items-center justify-between gap-5 py-6 text-xs text-ivory/50 md:flex-row">
          <p>© {new Date().getFullYear()} REWAAS. All rights reserved. · {s.address}</p>
          <div className="flex items-center gap-4 text-ivory/75">
            <a href={s.instagramUrl} aria-label="Instagram" target="_blank" rel="noopener noreferrer" className="hover:text-gold-300"><InstagramIcon size={19} /></a>
            <a href={s.facebookUrl} aria-label="Facebook" target="_blank" rel="noopener noreferrer" className="hover:text-gold-300"><FacebookIcon size={19} /></a>
            <a href={s.pinterestUrl} aria-label="Pinterest" target="_blank" rel="noopener noreferrer" className="hover:text-gold-300"><PinterestIcon size={19} /></a>
            <a href={s.youtubeUrl} aria-label="YouTube" target="_blank" rel="noopener noreferrer" className="hover:text-gold-300"><YoutubeIcon size={19} /></a>
            <a href={`https://wa.me/${s.whatsappNumber}`} aria-label="WhatsApp" target="_blank" rel="noopener noreferrer" className="hover:text-gold-300"><WhatsAppIcon size={18} /></a>
          </div>
          <p>UPI · Cards · Net Banking · Wallets · COD</p>
        </div>
      </div>
    </footer>
  );
}
