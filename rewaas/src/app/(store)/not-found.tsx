import Link from "next/link";
import Img from "@/components/Img";

export default function StoreNotFound() {
  return (
    <div className="container-site grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-2 lg:gap-16">
      <div className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden bg-ivory-200 lg:order-2 lg:max-w-md">
        <Img src="/photos/cat-sarees.jpg" alt="" fill sizes="(min-width:1024px) 28rem, 24rem" className="object-cover object-top" />
        <div className="absolute inset-4 border border-ivory/60" aria-hidden />
      </div>
      <div className="text-center lg:text-left">
        <p className="eyebrow">Error 404</p>
        <h1 className="h-display mt-4 text-balance">This thread seems to have come loose.</h1>
        <div className="divider-ornament my-6 text-xs lg:justify-start lg:before:hidden">✦</div>
        <p className="lead mx-auto max-w-md lg:mx-0">The page you're looking for may have moved or no longer exists. Let us guide you back to something beautiful.</p>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
          <Link href="/collections/new-arrivals" className="btn-primary">Shop New Arrivals</Link>
          <Link href="/" className="btn-outline">Return Home</Link>
        </div>
        <p className="mt-8 text-sm text-ink-400">Looking for an order? <Link href="/track-order" className="text-wine underline decoration-gold/60 underline-offset-4">Track it here</Link></p>
      </div>
    </div>
  );
}
