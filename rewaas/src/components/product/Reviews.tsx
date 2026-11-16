import Img from "@/components/Img";
import { StarIcon } from "@/components/icons";
import { fmtDate } from "@/lib/utils";
import ReviewForm from "./ReviewForm";

type R = { id: string; name: string; city: string | null; rating: number; title: string | null; body: string; images: string[]; verified: boolean; createdAt: Date };

export function Stars({ value, size = 15 }: { value: number; size?: number }) {
  return <span className="inline-flex gap-0.5 text-gold" aria-label={`${value.toFixed(1)} out of 5`}>{Array.from({ length: 5 }, (_, k) => <StarIcon key={k} size={size} filled={k < Math.round(value)} />)}</span>;
}

export default function Reviews({ reviews, productId, productSlug, canReview }: { reviews: R[]; productId: string; productSlug: string; canReview: boolean }) {
  const avg = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;
  const dist = [5, 4, 3, 2, 1].map((s) => ({ s, n: reviews.filter((r) => r.rating === s).length }));
  return (
    <section id="reviews" className="container-site scroll-mt-28 py-16 lg:py-24">
      <div className="grid gap-12 lg:grid-cols-[320px_1fr] lg:gap-20">
        <div>
          <p className="eyebrow">Reviews</p>
          <h2 className="h-section mt-2">Client Love</h2>
          {reviews.length > 0 ? (
            <>
              <div className="mt-6 flex items-end gap-3"><span className="font-display text-6xl leading-none">{avg.toFixed(1)}</span><div className="pb-1"><Stars value={avg} /><p className="mt-1 text-xs text-ink-400">{reviews.length} reviews</p></div></div>
              <ul className="mt-6 space-y-2">
                {dist.map(({ s, n }) => (
                  <li key={s} className="flex items-center gap-3 text-xs text-ink-400">
                    <span className="w-6">{s}★</span>
                    <span className="h-1 flex-1 bg-ink-200/60"><span className="block h-full bg-gold" style={{ width: `${(n / reviews.length) * 100}%` }} /></span>
                    <span className="w-5 text-right">{n}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : <p className="lead mt-4">Be the first to review this piece.</p>}
          <div className="mt-8"><ReviewForm productId={productId} productSlug={productSlug} canReview={canReview} /></div>
        </div>
        <ul className="divide-y divide-ink-200/70">
          {reviews.map((r) => (
            <li key={r.id} className="py-7 first:pt-0">
              <div className="flex items-center justify-between gap-4"><Stars value={r.rating} size={14} /><span className="text-xs text-ink-300">{fmtDate(r.createdAt)}</span></div>
              {r.title && <p className="mt-3 font-display text-xl">{r.title}</p>}
              <p className="mt-2 text-[15px] leading-relaxed text-ink/85">{r.body}</p>
              {r.images.length > 0 && (
                <div className="mt-4 flex gap-2">{r.images.map((src) => <div key={src} className="relative h-24 w-20 overflow-hidden bg-ivory-200"><Img src={src} alt={`Photo by ${r.name}`} fill sizes="80px" className="object-cover object-top" /></div>)}</div>
              )}
              <p className="mt-4 text-xs text-ink-400"><span className="font-medium text-ink">{r.name}</span>{r.city ? ` · ${r.city}` : ""}{r.verified && <span className="ml-2 text-[10px] uppercase tracking-[0.14em] text-gold-600">✓ Verified buyer</span>}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
