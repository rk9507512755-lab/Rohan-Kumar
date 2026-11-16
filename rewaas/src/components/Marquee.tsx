export default function Marquee({ items, tone = "light" }: { items: string[]; tone?: "light" | "dark" }) {
  const row = [...items, ...items];
  return (
    <div className={tone === "dark" ? "overflow-hidden border-y border-ivory/10 bg-wine-900 text-ivory/80" : "overflow-hidden border-y border-ink-200/60 bg-ivory-200/60 text-ink/70"} aria-label={items.join(", ")}>
      <div className="flex w-max animate-[marquee_45s_linear_infinite] gap-12 py-4 hover:[animation-play-state:paused]" aria-hidden>
        {row.map((t, i) => (
          <span key={i} className="flex items-center gap-12 whitespace-nowrap font-display text-lg italic sm:text-xl">{t}<span className="text-xs not-italic text-gold">✦</span></span>
        ))}
      </div>
    </div>
  );
}
