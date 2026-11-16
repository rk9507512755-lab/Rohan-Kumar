import Link from "next/link";
import Reveal from "./Reveal";

export default function SectionHeading({ eyebrow, title, text, href, linkLabel = "View all", align = "center", light = false }: { eyebrow?: string; title: string; text?: string; href?: string; linkLabel?: string; align?: "center" | "left"; light?: boolean }) {
  if (align === "left")
    return (
      <Reveal className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="max-w-xl">
          {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
          <h2 className={`h-section ${light ? "text-ivory" : ""}`}>{title}</h2>
          {text && <p className={`lead mt-3 ${light ? "text-ivory/70" : ""}`}>{text}</p>}
        </div>
        {href && <Link href={href} className={`link-underline shrink-0 text-[11px] uppercase tracking-[0.2em] ${light ? "text-gold-300" : "text-wine"}`}>{linkLabel} →</Link>}
      </Reveal>
    );
  return (
    <Reveal className="mx-auto mb-12 max-w-2xl text-center">
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h2 className={`h-section text-balance ${light ? "text-ivory" : ""}`}>{title}</h2>
      <div className="divider-ornament my-4 text-xs">✦</div>
      {text && <p className={`lead ${light ? "text-ivory/70" : ""}`}>{text}</p>}
    </Reveal>
  );
}
