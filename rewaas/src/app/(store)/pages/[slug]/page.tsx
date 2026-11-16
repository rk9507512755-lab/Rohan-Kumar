import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PinIcon, WhatsAppIcon } from "@/components/icons";
import { db } from "@/lib/db";
import { renderMarkdown } from "@/lib/markdown";
import { getSettings } from "@/lib/settings";
import { fmtDate } from "@/lib/utils";

const getPage = cache((slug: string) => db.page.findUnique({ where: { slug } }));

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getPage((await params).slug);
  if (!page) return { title: "Page not found", robots: { index: false } };
  return {
    title: page.title,
    description: page.metaDescription ?? undefined,
    alternates: { canonical: `/pages/${page.slug}` },
    openGraph: { title: `${page.title} | REWAAS`, description: page.metaDescription ?? undefined },
  };
}

const RELATED = [
  ["about", "About REWAAS"], ["contact", "Contact Us"], ["shipping-policy", "Shipping"], ["returns-exchanges", "Returns & Exchanges"], ["faqs", "FAQs"], ["privacy-policy", "Privacy"], ["terms", "Terms"],
];

export default async function CmsPage({ params }: Props) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) notFound();
  const isContact = page.slug === "contact";
  const s = isContact ? await getSettings() : null;
  return (
    <div>
      <header className="border-b border-ink-200/60 bg-ivory-200/60">
        <div className="container-site py-14 text-center sm:py-20">
          <p className="eyebrow">REWAAS</p>
          <h1 className="h-display mx-auto mt-4 max-w-3xl text-balance">{page.title}</h1>
          <div className="divider-ornament mt-5 text-xs">✦</div>
        </div>
      </header>
      <div className="container-site py-12 sm:py-16">
        <div className={isContact ? "mx-auto grid max-w-5xl gap-12 lg:grid-cols-[minmax(0,1fr)_340px]" : "mx-auto max-w-3xl"}>
          <article className="prose-rw [&>h2:first-child]:mt-0" dangerouslySetInnerHTML={{ __html: renderMarkdown(page.body) }} />
          {s && (
            <aside className="space-y-5 lg:pt-2">
              <div className="card p-6 sm:p-7">
                <p className="eyebrow">Speak with us</p>
                <p className="mt-3 font-display text-2xl leading-snug">Our stylists are a message away.</p>
                <a href={`https://wa.me/${s.whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent("Hello REWAAS, I'd love some help.")}`} target="_blank" rel="noopener noreferrer" className="btn-primary mt-6 w-full">
                  <WhatsAppIcon size={16} />Chat on WhatsApp
                </a>
                <dl className="mt-6 space-y-4 border-t border-ink-200/60 pt-5 text-sm">
                  <div><dt className="field-label">Email</dt><dd><a href={`mailto:${s.supportEmail}`} className="hover:text-wine">{s.supportEmail}</a></dd></div>
                  <div><dt className="field-label">Phone</dt><dd><a href={`tel:${s.supportPhone.replace(/\s/g, "")}`} className="hover:text-wine">{s.supportPhone}</a></dd></div>
                  <div><dt className="field-label">Studio</dt><dd className="flex gap-2 text-ink-400"><PinIcon size={16} className="mt-0.5 shrink-0 text-gold" />{s.address}</dd></div>
                </dl>
              </div>
              <Link href="/track-order" className="btn-outline w-full">Track an order</Link>
            </aside>
          )}
        </div>
        <div className="mx-auto mt-16 max-w-3xl border-t border-ink-200/70 pt-8">
          <p className="text-center text-xs text-ink-300">Last updated {fmtDate(page.updatedAt, { day: "numeric", month: "long", year: "numeric" })}</p>
          <nav aria-label="Client care" className="mt-6 flex flex-wrap justify-center gap-2">
            {RELATED.filter(([sl]) => sl !== page.slug).map(([sl, label]) => <Link key={sl} href={`/pages/${sl}`} className="chip">{label}</Link>)}
          </nav>
        </div>
      </div>
    </div>
  );
}
