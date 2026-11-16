export default function AccountLoading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-6">
      <div className="h-9 w-56 animate-pulse bg-ivory-200" />
      <div className="h-px bg-ink-200/70" />
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-24 w-[72px] shrink-0 animate-pulse bg-ivory-200" />
          <div className="flex-1 space-y-2 pt-2"><div className="h-3 w-1/3 animate-pulse bg-ivory-200" /><div className="h-3 w-1/2 animate-pulse bg-ivory-200" /><div className="h-3 w-1/4 animate-pulse bg-ivory-200" /></div>
        </div>
      ))}
    </div>
  );
}
