"use client";

import { useMemo, useState } from "react";
import Img from "@/components/Img";
import { useShop } from "@/components/ShopProvider";
import { CheckIcon, MinusIcon, PlusIcon, GiftIcon } from "@/components/icons";
import { inr } from "@/lib/money";
import { cn } from "@/lib/utils";

type Box = { id: string; name: string; description: string; image: string; price: number; capacity: number; dimensions: string | null; stock: number };
type Comp = { id: string; name: string; description: string; group: string; image: string; price: number; stock: number; max: number };
type Pack = { id: string; name: string; description: string; price: number };

const STEPS = ["Choose a box", "Fill your hamper", "Personalise", "Wrapping", "Review"];

export default function HamperBuilder({ boxes, components, packaging }: { boxes: Box[]; components: Comp[]; packaging: Pack[] }) {
  const { addHamper } = useShop();
  const [step, setStep] = useState(0);
  const [boxId, setBoxId] = useState<string | null>(boxes.find((b) => b.stock > 0)?.id ?? null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [group, setGroup] = useState<string>("All");
  const [recipientName, setRecipient] = useState("");
  const [senderName, setSender] = useState("");
  const [message, setMessage] = useState("");
  const [packId, setPackId] = useState(packaging[0]?.id ?? "");
  const [hamperQty, setHamperQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const box = boxes.find((b) => b.id === boxId) ?? null;
  const pack = packaging.find((p) => p.id === packId) ?? null;
  const groups = useMemo(() => ["All", ...new Set(components.map((c) => c.group))], [components]);
  const chosen = components.filter((c) => (qty[c.id] ?? 0) > 0);
  const units = chosen.reduce((a, c) => a + qty[c.id], 0);
  const capacity = box?.capacity ?? 0;
  const itemsTotal = chosen.reduce((a, c) => a + c.price * qty[c.id], 0);
  const unit = (box?.price ?? 0) + (pack?.price ?? 0) + itemsTotal;

  const change = (c: Comp, d: number) => {
    if (d > 0 && units >= capacity) { setError(`${box?.name ?? "This box"} holds up to ${capacity} items. Choose a larger box to add more.`); return; }
    setError(null);
    const cur = qty[c.id] ?? 0;
    setQty({ ...qty, [c.id]: Math.max(0, Math.min(c.max, c.stock, cur + d)) });
  };
  const canNext = [!!box, units > 0, true, !!pack, true][step];
  const add = async () => {
    if (!box || !pack || !units) return;
    setAdding(true);
    const ok = await addHamper({ boxId: box.id, packagingId: pack.id, components: chosen.map((c) => ({ id: c.id, qty: qty[c.id] })), recipientName, senderName, message }, hamperQty);
    setAdding(false);
    if (ok) { setQty({}); setMessage(""); setStep(0); }
  };

  return (
    <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-14">
      <div className="min-w-0">
        {/* Stepper */}
        <ol className="no-scrollbar -mx-4 flex gap-6 overflow-x-auto border-b border-ink-200/70 px-4 pb-4 sm:mx-0 sm:px-0">
          {STEPS.map((s, i) => (
            <li key={s} className="shrink-0">
              <button onClick={() => i <= step || (i === step + 1 && canNext) ? setStep(i) : null} className={cn("flex items-center gap-2.5 text-[11px] uppercase tracking-[0.16em] transition", i === step ? "text-wine" : i < step ? "text-ink" : "text-ink-300")}>
                <span className={cn("flex h-7 w-7 items-center justify-center rounded-full border text-xs transition", i === step ? "border-wine bg-wine text-ivory" : i < step ? "border-ink bg-ink text-ivory" : "border-ink-200")}>{i < step ? <CheckIcon size={13} /> : i + 1}</span>{s}
              </button>
            </li>
          ))}
        </ol>

        <div key={step} className="animate-fadeUp pt-8">
          {step === 0 && (
            <div className="grid gap-5 sm:grid-cols-3">
              {boxes.map((b) => (
                <button key={b.id} disabled={b.stock <= 0} onClick={() => { setBoxId(b.id); if (units > b.capacity) setError(`You've chosen ${units} items — ${b.name} holds ${b.capacity}. Remove a few in the next step.`); else setError(null); }}
                  className={cn("group grid grid-cols-[110px_1fr] items-center gap-4 text-left transition sm:block", b.stock <= 0 && "opacity-50")}>
                  <div className={cn("relative aspect-[4/5] overflow-hidden bg-ivory-200 ring-offset-4 ring-offset-ivory transition", boxId === b.id ? "ring-1 ring-wine" : "group-hover:ring-1 group-hover:ring-ink-200")}>
                    <Img src={b.image} alt={b.name} fill sizes="(min-width:640px) 22vw, 90vw" className="img-zoom object-cover" />
                    {boxId === b.id && <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-wine text-ivory"><CheckIcon size={14} /></span>}
                  </div>
                  <div>
                    <p className="font-display text-xl sm:mt-3">{b.name}</p>
                    <p className="text-sm text-ink-400">{b.description}</p>
                    <p className="mt-2 text-sm"><span className="font-medium">{inr(b.price)}</span><span className="text-ink-400"> · holds {b.capacity} items{b.dimensions ? ` · ${b.dimensions}` : ""}</span></p>
                    {b.stock <= 0 && <p className="text-xs text-wine">Sold out</p>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                  {groups.map((g) => <button key={g} onClick={() => setGroup(g)} className={cn("chip whitespace-nowrap", g === group && "chip-active")}>{g}</button>)}
                </div>
                <div className="flex items-center gap-3 text-xs text-ink-400">
                  <span>{units} / {capacity} items</span>
                  <span className="h-1 w-28 bg-ink-200/70"><span className="block h-full bg-wine transition-all duration-500" style={{ width: `${capacity ? (units / capacity) * 100 : 0}%` }} /></span>
                </div>
              </div>
              {error && <p role="alert" className="mb-4 border-l-2 border-wine bg-wine-50 px-4 py-2.5 text-sm text-wine-800">{error}</p>}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {components.filter((c) => group === "All" || c.group === group).map((c) => {
                  const q = qty[c.id] ?? 0;
                  return (
                    <div key={c.id} className={cn("flex flex-col border bg-white transition", q ? "border-wine" : "border-ink-200/70")}>
                      <div className="relative aspect-square overflow-hidden bg-ivory-200">
                        <Img src={c.image} alt={c.name} fill sizes="(min-width:768px) 18vw, 45vw" className="object-cover" />
                        {q > 0 && <span className="absolute left-2 top-2 animate-fadeIn bg-wine px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-ivory">In hamper ×{q}</span>}
                      </div>
                      <div className="flex flex-1 flex-col p-3.5">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-ink-300">{c.group}</p>
                        <p className="font-display text-lg leading-tight">{c.name}</p>
                        <p className="mt-1 text-xs text-ink-400">{c.description}</p>
                        <div className="mt-auto flex items-center justify-between pt-3">
                          <span className="text-sm font-medium">{inr(c.price)}</span>
                          {q === 0 ? (
                            <button onClick={() => change(c, 1)} disabled={c.stock <= 0} className="border border-ink px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] transition hover:bg-ink hover:text-ivory disabled:border-ink-200 disabled:text-ink-300">{c.stock <= 0 ? "Sold out" : "Add"}</button>
                          ) : (
                            <div className="flex items-center border border-wine text-wine">
                              <button onClick={() => change(c, -1)} className="p-1.5" aria-label={`Remove one ${c.name}`}><MinusIcon size={13} /></button>
                              <span className="w-6 text-center text-sm">{q}</span>
                              <button onClick={() => change(c, 1)} disabled={q >= Math.min(c.max, c.stock)} className="p-1.5 disabled:opacity-30" aria-label={`Add one more ${c.name}`}><PlusIcon size={13} /></button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-4">
                <div><label className="field-label" htmlFor="h-to">To (recipient&apos;s name)</label><input id="h-to" value={recipientName} onChange={(e) => setRecipient(e.target.value.slice(0, 60))} className="field" placeholder="e.g. Ananya" /></div>
                <div><label className="field-label" htmlFor="h-msg">Your message <span className="normal-case tracking-normal text-ink-300">({300 - message.length} left)</span></label><textarea id="h-msg" rows={5} value={message} onChange={(e) => setMessage(e.target.value.slice(0, 300))} className="field" placeholder="Write something from the heart…" /></div>
                <div><label className="field-label" htmlFor="h-from">From</label><input id="h-from" value={senderName} onChange={(e) => setSender(e.target.value.slice(0, 60))} className="field" placeholder="Your name" /></div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {["Congratulations on your new beginning!", "Happy Diwali — may your home glow with light and love.", "Thank you for standing beside me.", "Happy Birthday, beautiful!"].map((t) => <button key={t} type="button" onClick={() => setMessage(t)} className="chip text-left">{t}</button>)}
                </div>
              </div>
              <div className="flex items-center justify-center bg-ivory-200 p-8">
                <div className="w-full max-w-xs rotate-[-2deg] border border-gold/60 bg-ivory p-8 text-center shadow-[0_20px_40px_-25px_rgba(43,34,32,.5)] transition">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-gold-600">REWAAS</p>
                  <p className="mt-5 font-display text-xl italic text-ink">{recipientName ? `Dear ${recipientName},` : "Dear …,"}</p>
                  <p className="mt-3 min-h-[72px] whitespace-pre-line font-display text-lg leading-relaxed text-ink/80">{message || "Your message will appear here, hand-lettered on our keepsake card."}</p>
                  <p className="mt-5 font-display text-lg italic text-wine">{senderName ? `With love, ${senderName}` : "With love"}</p>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-4 sm:grid-cols-3">
              {packaging.map((p) => (
                <button key={p.id} onClick={() => setPackId(p.id)} className={cn("border bg-white p-6 text-left transition", packId === p.id ? "border-wine" : "border-ink-200/70 hover:border-ink-300")}>
                  <GiftIcon size={26} className={packId === p.id ? "text-wine" : "text-gold-600"} />
                  <p className="mt-4 font-display text-xl">{p.name}</p>
                  <p className="mt-1 text-sm text-ink-400">{p.description}</p>
                  <p className="mt-3 text-sm font-medium">{p.price ? `+ ${inr(p.price)}` : "Complimentary"}</p>
                </button>
              ))}
            </div>
          )}

          {step === 4 && box && (
            <div className="space-y-6">
              <div className="grid gap-4 bg-white p-6 sm:grid-cols-[140px_1fr]">
                <div className="relative aspect-[4/5] overflow-hidden bg-ivory-200"><Img src={box.image} alt={box.name} fill sizes="140px" className="object-cover" /></div>
                <div>
                  <p className="font-display text-2xl">{box.name}</p>
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {chosen.map((c) => <li key={c.id} className="flex justify-between gap-4"><span>{c.name}{qty[c.id] > 1 ? ` × ${qty[c.id]}` : ""}</span><span className="text-ink-400">{inr(c.price * qty[c.id])}</span></li>)}
                    <li className="flex justify-between gap-4 text-ink-400"><span>{box.name}</span><span>{inr(box.price)}</span></li>
                    {pack && <li className="flex justify-between gap-4 text-ink-400"><span>{pack.name}</span><span>{pack.price ? inr(pack.price) : "Free"}</span></li>}
                  </ul>
                  {message && <p className="mt-4 border-l-2 border-gold pl-3 font-display text-lg italic">“{message}”</p>}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[11px] uppercase tracking-[0.16em] text-ink-400">How many hampers?</span>
                <div className="inline-flex items-center border border-ink-200 bg-white">
                  <button onClick={() => setHamperQty((q) => Math.max(1, q - 1))} className="p-2" aria-label="Fewer hampers"><MinusIcon size={14} /></button>
                  <span className="w-8 text-center text-sm">{hamperQty}</span>
                  <button onClick={() => setHamperQty((q) => Math.min(10, q + 1))} className="p-2" aria-label="More hampers"><PlusIcon size={14} /></button>
                </div>
                <span className="text-xs text-ink-400">Great for bridesmaids & teams</span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-10 flex items-center justify-between border-t border-ink-200/70 pt-6">
          <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="text-[11px] uppercase tracking-[0.16em] text-ink-400 disabled:opacity-0">← Back</button>
          {step < 4 ? (
            <button onClick={() => canNext && setStep((s) => s + 1)} disabled={!canNext || (step === 1 && units > capacity)} className="btn-primary">Continue</button>
          ) : (
            <button onClick={add} disabled={adding || !units} className="btn-primary">{adding ? "Adding…" : `Add to Bag · ${inr(unit * hamperQty)}`}</button>
          )}
        </div>
      </div>

      {/* Live preview */}
      <aside className="h-fit lg:sticky lg:top-32">
        <div className="bg-white p-6">
          <p className="eyebrow">Your Hamper</p>
          <div className="relative mt-4 aspect-[4/3] overflow-hidden bg-ivory-200">
            {box ? <Img src={box.image} alt={box.name} fill sizes="400px" className="object-cover opacity-90" /> : <div className="flex h-full items-center justify-center text-sm text-ink-300">Choose a box to begin</div>}
            {chosen.length > 0 && (
              <div className="absolute inset-x-4 bottom-4 grid grid-cols-5 gap-1.5 rounded-sm bg-ivory/85 p-2 backdrop-blur">
                {chosen.flatMap((c) => Array.from({ length: qty[c.id] }, (_, k) => (
                  <div key={c.id + k} className="relative aspect-square animate-fadeUp overflow-hidden bg-ivory-200" title={c.name}><Img src={c.image} alt={c.name} fill sizes="60px" className="object-cover" /></div>
                )))}
                {Array.from({ length: Math.max(0, capacity - units) }, (_, k) => <div key={`e${k}`} className="aspect-square border border-dashed border-ink-200" />)}
              </div>
            )}
          </div>
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-ink-400">{box?.name ?? "Box"}</dt><dd>{box ? inr(box.price) : "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-400">{units} item{units === 1 ? "" : "s"}</dt><dd>{inr(itemsTotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-400">{pack?.name ?? "Wrapping"}</dt><dd>{pack ? (pack.price ? inr(pack.price) : "Free") : "—"}</dd></div>
            <div className="flex justify-between border-t border-ink-200/70 pt-3 text-base font-medium"><dt>Hamper price</dt><dd>{inr(unit)}</dd></div>
            {hamperQty > 1 && <div className="flex justify-between text-ink-400"><dt>× {hamperQty} hampers</dt><dd>{inr(unit * hamperQty)}</dd></div>}
          </dl>
          <p className="mt-4 text-xs text-ink-400">Prices include GST. Hand-packed in 2–3 days. Personalised hampers are non-returnable.</p>
        </div>
      </aside>
    </div>
  );
}
