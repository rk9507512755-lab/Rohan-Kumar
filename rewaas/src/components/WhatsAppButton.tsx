import { WhatsAppIcon } from "./icons";

export default function WhatsAppButton({ number }: { number: string }) {
  const href = `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent("Hello REWAAS, I'd like some help with my order.")}`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label="Chat with us on WhatsApp"
      className="no-print fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#1f7a4d] text-white shadow-lg transition hover:scale-105 sm:bottom-7 sm:right-7 sm:h-14 sm:w-14">
      <WhatsAppIcon size={26} />
    </a>
  );
}
