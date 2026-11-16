"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="container-site py-28 text-center">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="h-display mt-3">A thread came loose.</h1>
      <p className="lead mx-auto mt-4 max-w-md">We couldn&apos;t load this page just now. Please try again — your bag is safe.</p>
      <div className="mt-8 flex justify-center gap-3"><button onClick={reset} className="btn-primary">Try again</button><Link href="/" className="btn-outline">Go home</Link></div>
      {error.digest && <p className="mt-6 text-xs text-ink-300">Reference: {error.digest}</p>}
    </div>
  );
}
