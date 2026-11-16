"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Fades & lifts its content into view on scroll. `stagger` animates direct children one after another. */
export default function Reveal({ children, as: Tag = "div", className, stagger = false, delay = 0 }: { children: ReactNode; as?: ElementType; className?: string; stagger?: boolean; delay?: number }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) { el.classList.add("is-in"); return; }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { el.classList.add("is-in"); io.disconnect(); }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref} className={cn(stagger ? "reveal-stagger" : "reveal", className)} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>{children}</Tag>;
}
