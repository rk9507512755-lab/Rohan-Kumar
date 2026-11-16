import type { ReactNode } from "react";

export default function PageTitle({ title, text, action }: { title: string; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b border-ink-200/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-[2rem] leading-tight sm:text-[2.4rem]">{title}</h1>
        {text && <p className="mt-1.5 text-sm text-ink-400">{text}</p>}
      </div>
      {action}
    </div>
  );
}
