"use client";

import { useState } from "react";
import Img from "@/components/Img";
import { ChevronLeft, ChevronRight, CloseIcon, PlayIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

type Media = { url: string; alt: string | null; video?: boolean };

export default function Gallery({ images, videoUrl, name }: { images: { url: string; alt: string | null }[]; videoUrl?: string | null; name: string }) {
  const media: Media[] = [...images, ...(videoUrl ? [{ url: videoUrl, alt: `${name} video`, video: true }] : [])];
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [lightbox, setLightbox] = useState(false);
  const cur = media[i] ?? media[0];
  const go = (d: number) => setI((x) => (x + d + media.length) % media.length);
  if (!cur) return <div className="aspect-[4/5] bg-ivory-200" />;
  return (
    <div className="lg:sticky lg:top-28">
      <div className="flex flex-col-reverse gap-3 lg:flex-row">
        <div className="no-scrollbar flex gap-2 overflow-x-auto lg:max-h-[640px] lg:w-20 lg:flex-col lg:overflow-y-auto">
          {media.map((m, idx) => (
            <button key={m.url + idx} onClick={() => setI(idx)} aria-label={`View image ${idx + 1}`} aria-current={idx === i}
              className={cn("relative aspect-[4/5] w-16 shrink-0 overflow-hidden bg-ivory-200 transition lg:w-20", idx === i ? "ring-1 ring-wine ring-offset-2 ring-offset-ivory" : "opacity-70 hover:opacity-100")}>
              {m.video ? <span className="absolute inset-0 flex items-center justify-center bg-ink/80 text-ivory"><PlayIcon size={18} /></span> : <Img src={m.url} alt="" fill sizes="80px" className="object-cover object-top" />}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <div
            className={cn("relative aspect-[4/5] overflow-hidden bg-ivory-200", !cur.video && "cursor-zoom-in")}
            onMouseMove={(e) => { if (cur.video || window.matchMedia("(hover: none)").matches) return; const r = e.currentTarget.getBoundingClientRect(); setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }); }}
            onMouseLeave={() => setZoom(null)}
            onClick={() => !cur.video && setLightbox(true)}
          >
            {cur.video ? (
              <video src={cur.url} controls playsInline className="h-full w-full object-cover" />
            ) : (
              <Img src={cur.url} alt={cur.alt ?? name} fill priority sizes="(min-width:1024px) 50vw, 100vw"
                className="object-cover object-top transition-transform duration-200" style={zoom ? { transform: "scale(2)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined} />
            )}
          </div>
          {media.length > 1 && (
            <>
              <button onClick={() => go(-1)} aria-label="Previous image" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-ivory/90 p-2 shadow-sm lg:hidden"><ChevronLeft size={18} /></button>
              <button onClick={() => go(1)} aria-label="Next image" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-ivory/90 p-2 shadow-sm lg:hidden"><ChevronRight size={18} /></button>
            </>
          )}
          <p className="mt-2 hidden text-center text-[11px] uppercase tracking-[0.16em] text-ink-300 lg:block">Hover to zoom · Click for full screen</p>
        </div>
      </div>
      {lightbox && (
        <div className="fixed inset-0 z-[90] flex animate-fadeIn items-center justify-center bg-ink/95" role="dialog" aria-label="Image viewer" onClick={() => setLightbox(false)}>
          <button className="absolute right-5 top-5 text-ivory" aria-label="Close"><CloseIcon size={26} /></button>
          {media.length > 1 && <button onClick={(e) => { e.stopPropagation(); go(-1); }} className="absolute left-4 p-3 text-ivory" aria-label="Previous"><ChevronLeft size={30} /></button>}
          <div className="relative h-[90vh] w-[90vw] max-w-[900px]" onClick={(e) => e.stopPropagation()}>
            {cur.video ? <video src={cur.url} controls autoPlay className="h-full w-full object-contain" /> : <Img src={cur.url} alt={cur.alt ?? name} fill sizes="90vw" className="object-contain" />}
          </div>
          {media.length > 1 && <button onClick={(e) => { e.stopPropagation(); go(1); }} className="absolute right-4 p-3 text-ivory" aria-label="Next"><ChevronRight size={30} /></button>}
        </div>
      )}
    </div>
  );
}
