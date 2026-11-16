import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 20, p: P) => ({ width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, ...p });

export const SearchIcon = ({ size, ...p }: P) => <svg {...base(size, p)}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>;
export const UserIcon = ({ size, ...p }: P) => <svg {...base(size, p)}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>;
export const HeartIcon = ({ size, filled, ...p }: P & { filled?: boolean }) => <svg {...base(size, p)} fill={filled ? "currentColor" : "none"}><path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.9 4 7.4 4c2 0 3.5 1.1 4.6 2.7C13.1 5.1 14.6 4 16.6 4c3.5 0 5.8 3.6 4.6 7.1-1.7 4.8-9.2 9.4-9.2 9.4Z" /></svg>;
export const BagIcon = ({ size, ...p }: P) => <svg {...base(size, p)}><path d="M5 8h14l-1 13H6L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>;
export const MenuIcon = ({ size, ...p }: P) => <svg {...base(size, p)}><path d="M3 7h18M3 12h18M3 17h12" /></svg>;
export const CloseIcon = ({ size, ...p }: P) => <svg {...base(size, p)}><path d="M5 5l14 14M19 5 5 19" /></svg>;
export const ChevronDown = ({ size, ...p }: P) => <svg {...base(size, p)}><path d="m6 9 6 6 6-6" /></svg>;
export const ChevronRight = ({ size, ...p }: P) => <svg {...base(size, p)}><path d="m9 6 6 6-6 6" /></svg>;
export const ChevronLeft = ({ size, ...p }: P) => <svg {...base(size, p)}><path d="m15 6-6 6 6 6" /></svg>;
export const ArrowRight = ({ size, ...p }: P) => <svg {...base(size, p)}><path d="M4 12h16m-6-6 6 6-6 6" /></svg>;
export const PlusIcon = ({ size, ...p }: P) => <svg {...base(size, p)}><path d="M12 5v14M5 12h14" /></svg>;
export const MinusIcon = ({ size, ...p }: P) => <svg {...base(size, p)}><path d="M5 12h14" /></svg>;
export const StarIcon = ({ size, filled = true, ...p }: P & { filled?: boolean }) => <svg {...base(size, p)} fill={filled ? "currentColor" : "none"} strokeWidth={1.1}><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" /></svg>;
export const TruckIcon = ({ size, ...p }: P) => <svg {...base(size, p)}><path d="M2 6h11v10H2zM13 10h4l4 4v2h-8" /><circle cx="6" cy="18" r="1.8" /><circle cx="17" cy="18" r="1.8" /></svg>;
export const ReturnIcon = ({ size, ...p }: P) => <svg {...base(size, p)}><path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></svg>;
export const ShieldIcon = ({ size, ...p }: P) => <svg {...base(size, p)}><path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></svg>;
export const GiftIcon = ({ size, ...p }: P) => <svg {...base(size, p)}><path d="M4 11h16v10H4zM3 7h18v4H3zM12 7v14" /><path d="M12 7S10.5 3 8 3.5 7.5 7 12 7Zm0 0s1.5-4 4-3.5S16.5 7 12 7Z" /></svg>;
export const SparkIcon = ({ size, ...p }: P) => <svg {...base(size, p)}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>;
export const CheckIcon = ({ size, ...p }: P) => <svg {...base(size, p)}><path d="m5 12 5 5 9-10" /></svg>;
export const PlayIcon = ({ size, ...p }: P) => <svg {...base(size, p)} fill="currentColor"><path d="M8 5v14l11-7L8 5Z" /></svg>;
export const RulerIcon = ({ size, ...p }: P) => <svg {...base(size, p)}><path d="M3 15 15 3l6 6L9 21l-6-6Z" /><path d="m7 11 2 2M10 8l2 2M13 5l2 2" /></svg>;
export const PinIcon = ({ size, ...p }: P) => <svg {...base(size, p)}><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></svg>;
export const InstagramIcon = ({ size, ...p }: P) => <svg {...base(size, p)}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".6" fill="currentColor" /></svg>;
export const FacebookIcon = ({ size, ...p }: P) => <svg {...base(size, p)}><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8Z" /></svg>;
export const PinterestIcon = ({ size, ...p }: P) => <svg {...base(size, p)}><circle cx="12" cy="12" r="9" /><path d="M10.5 20 12 13m0 0c-1-3 .5-5.5 3-5.5 2 0 3 1.5 2.5 3.5-.5 2.3-2 3.5-3.5 3-1-.3-1.5-1-2-1Z" /></svg>;
export const YoutubeIcon = ({ size, ...p }: P) => <svg {...base(size, p)}><rect x="2.5" y="5.5" width="19" height="13" rx="4" /><path d="m10 9.5 4.5 2.5-4.5 2.5v-5Z" fill="currentColor" /></svg>;
export const WhatsAppIcon = ({ size = 24, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.2-.3-.2-.5-.3Z" />
  </svg>
);
