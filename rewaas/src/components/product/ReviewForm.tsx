"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { submitReview } from "@/app/actions/reviews";
import { StarIcon } from "@/components/icons";

export default function ReviewForm({ productId, productSlug, canReview }: { productId: string; productSlug: string; canReview: boolean }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [state, action, pending] = useActionState(submitReview, null);
  if (!canReview) return <Link href={`/account/login?next=/products/${productSlug}%23reviews`} className="btn-outline btn-sm">Sign in to write a review</Link>;
  if (state?.ok) return <p className="font-display text-lg italic text-wine">Thank you — your review is published.</p>;
  if (!open) return <button onClick={() => setOpen(true)} className="btn-outline btn-sm">Write a review</button>;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={rating} />
      <div className="flex gap-1 text-gold" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} stars`} onClick={() => setRating(n)}><StarIcon size={24} filled={n <= rating} /></button>)}
      </div>
      <div><label className="field-label" htmlFor="rv-title">Title</label><input id="rv-title" name="title" maxLength={80} className="field" /></div>
      <div><label className="field-label" htmlFor="rv-body">Your review</label><textarea id="rv-body" name="body" required minLength={10} maxLength={1500} rows={4} className="field" />{state?.error && <p className="field-error">{state.error}</p>}</div>
      <div><label className="field-label" htmlFor="rv-city">City (optional)</label><input id="rv-city" name="city" maxLength={60} className="field" /></div>
      <button disabled={pending} className="btn-primary btn-sm">{pending ? "Submitting…" : "Submit review"}</button>
    </form>
  );
}
