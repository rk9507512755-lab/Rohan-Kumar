type Addr = { name?: string; phone?: string; line1?: string; line2?: string; landmark?: string; city?: string; state?: string; pincode?: string };

export function asAddress(v: unknown): Addr | null {
  return v && typeof v === "object" ? (v as Addr) : null;
}

export function AddressBlock({ value }: { value: unknown }) {
  const a = asAddress(value);
  if (!a) return <p className="text-sm text-ink-400">—</p>;
  return (
    <address className="text-sm not-italic leading-relaxed">
      <span className="font-medium">{a.name}</span>
      <br />
      {a.line1}
      {a.line2 && (
        <>
          <br />
          {a.line2}
        </>
      )}
      {a.landmark && (
        <>
          <br />
          Near {a.landmark}
        </>
      )}
      <br />
      {a.city}, {a.state} {a.pincode}
      {a.phone && (
        <>
          <br />
          <span className="text-ink-400">Phone: {a.phone}</span>
        </>
      )}
    </address>
  );
}

type Hamper = {
  box?: { name?: string };
  components?: { name?: string; qty?: number; group?: string }[];
  packaging?: { name?: string };
  config?: { recipientName?: string; message?: string; senderName?: string };
};

/** Contents of a custom hamper from the OrderItem.hamperConfig snapshot. */
export function HamperContents({ value }: { value: unknown }) {
  if (!value || typeof value !== "object") return null;
  const h = value as Hamper;
  return (
    <div className="mt-2 border-l-2 border-gold/50 bg-ivory-100 px-3 py-2 text-xs leading-relaxed text-ink/80">
      {h.box?.name && (
        <p>
          <span className="text-ink-400">Box:</span> {h.box.name}
        </p>
      )}
      {!!h.components?.length && (
        <ul className="my-1 list-inside list-disc">
          {h.components.map((c, i) => (
            <li key={i}>
              {c.qty ?? 1} × {c.name}
              {c.group && <span className="text-ink-400"> ({c.group})</span>}
            </li>
          ))}
        </ul>
      )}
      {h.packaging?.name && (
        <p>
          <span className="text-ink-400">Packaging:</span> {h.packaging.name}
        </p>
      )}
      {h.config?.recipientName && (
        <p>
          <span className="text-ink-400">For:</span> {h.config.recipientName}
          {h.config.senderName && <span className="text-ink-400"> · from {h.config.senderName}</span>}
        </p>
      )}
      {h.config?.message && <p className="italic">“{h.config.message}”</p>}
    </div>
  );
}
