import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  PENDING_PAYMENT: "border-gold/50 bg-gold/10 text-gold-600",
  CONFIRMED: "border-ink-200 bg-ivory-200 text-ink",
  PROCESSING: "border-ink-200 bg-ivory-200 text-ink",
  SHIPPED: "border-wine/30 bg-wine-50 text-wine",
  OUT_FOR_DELIVERY: "border-wine/30 bg-wine-50 text-wine",
  DELIVERED: "border-wine bg-wine text-ivory",
  CANCELLED: "border-ink-200 bg-transparent text-ink-300 line-through decoration-ink-200",
  RETURN_REQUESTED: "border-gold/50 bg-gold/10 text-gold-600",
  RETURNED: "border-ink-200 bg-ivory-200 text-ink-400",
  // return request statuses
  REQUESTED: "border-gold/50 bg-gold/10 text-gold-600",
  APPROVED: "border-wine/30 bg-wine-50 text-wine",
  REJECTED: "border-ink-200 bg-transparent text-ink-300",
  PICKED_UP: "border-wine/30 bg-wine-50 text-wine",
  COMPLETED: "border-wine bg-wine text-ivory",
};

export default function StatusPill({ status, label, className }: { status: string; label: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em]", TONE[status] ?? "border-ink-200 text-ink", className)} style={{ fontWeight: 500 }}>
      {label}
    </span>
  );
}
