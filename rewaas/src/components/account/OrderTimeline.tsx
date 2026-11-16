import { CheckIcon, CloseIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { TimelineStep } from "./form-state";

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

function Dot({ state }: { state: TimelineStep["state"] }) {
  return (
    <span className={cn("relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition",
      state === "done" && "border-wine bg-wine text-ivory",
      state === "current" && "border-wine bg-ivory text-wine ring-4 ring-wine/10",
      state === "upcoming" && "border-ink-200 bg-ivory text-ink-200",
      state === "cancelled" && "border-ink bg-ink text-ivory")}>
      {state === "done" ? <CheckIcon size={13} /> : state === "cancelled" ? <CloseIcon size={12} /> : <span className={cn("h-1.5 w-1.5 rounded-full", state === "current" ? "bg-wine" : "bg-ink-200")} />}
    </span>
  );
}

/** Pure presentational timeline — horizontal on desktop, vertical on mobile. Usable from server and client components. */
export default function OrderTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <>
      {/* Mobile / narrow: vertical */}
      <ol className="md:hidden">
        {steps.map((s, i) => (
          <li key={s.key} className="relative flex gap-4 pb-6 last:pb-0">
            {i < steps.length - 1 && <span aria-hidden className={cn("absolute left-[13px] top-7 h-[calc(100%-28px)] w-px", steps[i + 1].state === "upcoming" ? "bg-ink-200" : "bg-wine")} />}
            <Dot state={s.state} />
            <div className="pt-0.5">
              <p className={cn("text-[13px] uppercase tracking-[0.14em]", s.state === "upcoming" ? "text-ink-300" : "text-ink")} style={{ fontWeight: 500 }}>{s.label}</p>
              {s.date && <p className="mt-0.5 text-xs text-ink-400">{fmt(s.date)} · {fmtTime(s.date)}</p>}
              {s.note && <p className="mt-1 text-sm text-ink-400">{s.note}</p>}
            </div>
          </li>
        ))}
      </ol>
      {/* Desktop: horizontal */}
      <ol className="hidden md:grid" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((s, i) => (
          <li key={s.key} className="relative flex flex-col items-center px-2 text-center">
            {i > 0 && <span aria-hidden className={cn("absolute right-1/2 top-[13px] h-px w-full", s.state === "upcoming" ? "bg-ink-200" : "bg-wine")} />}
            <Dot state={s.state} />
            <p className={cn("mt-3 text-[11px] uppercase tracking-[0.16em]", s.state === "upcoming" ? "text-ink-300" : "text-ink")} style={{ fontWeight: 500 }}>{s.label}</p>
            {s.date && <p className="mt-1 text-xs text-ink-400">{fmt(s.date)}</p>}
            {s.note && <p className="mt-1 max-w-[16ch] text-xs leading-snug text-ink-300">{s.note}</p>}
          </li>
        ))}
      </ol>
    </>
  );
}
