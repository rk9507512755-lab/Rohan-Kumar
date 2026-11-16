"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Img from "@/components/Img";
import { ChevronLeft, ChevronRight } from "@/components/icons";
import { cn } from "@/lib/utils";

export type Slide = { id: string; eyebrow: string | null; title: string; subtitle: string | null; ctaLabel: string | null; ctaHref: string | null; cta2Label: string | null; cta2Href: string | null; desktopImage: string; mobileImage: string | null };

export default function HeroCarousel({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = slides.length;
  useEffect(() => {
    if (n < 2 || paused) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), 6500);
    return () => clearInterval(t);
  }, [n, paused]);
  if (!n) return null;
  return (
    <section aria-roledescription="carousel" aria-label="Featured" className="relative h-[calc(100svh-120px)] min-h-[560px] w-full overflow-hidden bg-wine-900 md:h-[78vh] md:max-h-[860px]"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {slides.map((s, idx) => (
        <div key={s.id} aria-hidden={idx !== i} className={cn("absolute inset-0 transition-opacity duration-[1200ms]", idx === i ? "opacity-100" : "pointer-events-none opacity-0")}>
          <Img src={s.mobileImage ?? s.desktopImage} alt={s.title} fill priority={idx === 0} sizes="100vw" className={cn("object-cover md:hidden", idx === i && "animate-[heroZoom_9s_ease-out_both]")} />
          <Img src={s.desktopImage} alt={s.title} fill priority={idx === 0} sizes="100vw" className={cn("hidden object-cover md:block", idx === i && "animate-[heroZoom_9s_ease-out_both]")} />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/15 to-transparent md:bg-gradient-to-r md:from-ink/70 md:via-ink/25 md:to-transparent" />
          <div className="container-site relative flex h-full items-end pb-20 md:items-center md:pb-0">
            {idx === i && (
              <div className="max-w-xl text-ivory">
                {s.eyebrow && <p className="mb-4 animate-fadeUp text-[11px] uppercase tracking-[0.32em] text-gold-300">{s.eyebrow}</p>}
                <h1 className="h-display animate-fadeUp text-balance [animation-delay:120ms] md:text-[4.2rem]">{s.title}</h1>
                {s.subtitle && <p className="mt-5 max-w-md animate-fadeUp text-[15px] leading-relaxed text-ivory/85 [animation-delay:240ms] sm:text-base">{s.subtitle}</p>}
                <div className="mt-8 flex animate-fadeUp flex-wrap gap-3 [animation-delay:360ms]">
                  {s.ctaLabel && s.ctaHref && <Link href={s.ctaHref} className="btn-light">{s.ctaLabel}</Link>}
                  {s.cta2Label && s.cta2Href && <Link href={s.cta2Href} className="btn-ghost-light">{s.cta2Label}</Link>}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
      {n > 1 && (
        <>
          <div className="absolute bottom-7 left-1/2 flex -translate-x-1/2 gap-2.5">
            {slides.map((s, idx) => (
              <button key={s.id} onClick={() => setI(idx)} aria-label={`Slide ${idx + 1}`} aria-current={idx === i}
                className={cn("h-[2px] transition-all duration-500", idx === i ? "w-10 bg-ivory" : "w-5 bg-ivory/45 hover:bg-ivory/80")} />
            ))}
          </div>
          <button onClick={() => setI((i - 1 + n) % n)} aria-label="Previous slide" className="absolute left-4 top-1/2 hidden -translate-y-1/2 rounded-full border border-ivory/40 p-2.5 text-ivory transition hover:bg-ivory hover:text-wine md:block"><ChevronLeft size={18} /></button>
          <button onClick={() => setI((i + 1) % n)} aria-label="Next slide" className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-full border border-ivory/40 p-2.5 text-ivory transition hover:bg-ivory hover:text-wine md:block"><ChevronRight size={18} /></button>
        </>
      )}
    </section>
  );
}
