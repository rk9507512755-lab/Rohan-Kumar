import type { ReactNode } from "react";
import Img from "@/components/Img";

/** Split editorial layout for sign-in / register: photograph on the left (desktop only), form on the right. */
export default function AuthShell({ image, imageAlt, quote, eyebrow, title, intro, children, footer }: {
  image: string; imageAlt: string; quote?: string; eyebrow: string; title: string; intro?: ReactNode; children: ReactNode; footer?: ReactNode;
}) {
  return (
    <div className="grid lg:min-h-[calc(100vh-120px)] lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-ivory-200 lg:block">
        <Img src={image} alt={imageAlt} fill priority sizes="50vw" className="object-cover object-top" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/5 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-12 xl:p-16">
          <p className="text-[10px] uppercase tracking-[0.4em] text-gold-300">REWAAS</p>
          <p className="mt-3 max-w-md font-display text-4xl leading-tight text-ivory xl:text-[2.75rem]">{quote ?? "The Beauty of Being You."}</p>
        </div>
      </div>
      <div className="flex items-start justify-center px-5 py-12 sm:px-10 sm:py-16 lg:items-center lg:py-20">
        <div className="w-full max-w-[420px]">
          <div className="mb-9 text-center">
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="mt-3 font-display text-[2.4rem] leading-tight sm:text-[2.75rem]">{title}</h1>
            <div className="divider-ornament my-4 text-xs">✦</div>
            {intro && <p className="lead">{intro}</p>}
          </div>
          {children}
          {footer && <div className="mt-10 border-t border-ink-200/70 pt-8 text-center">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
