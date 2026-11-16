/** Accessible CSS bar chart: visual bars are aria-hidden, a screen-reader table carries the data. */
export default function BarChart({ title, data, format = (n) => String(n) }: { title: string; data: { label: string; value: number }[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure>
      <figcaption className="sr-only">{title}</figcaption>
      <div aria-hidden className="flex h-48 items-end gap-2 border-b border-ink-200 sm:gap-4">
        {data.map((d) => {
          const h = Math.round((d.value / max) * 100);
          return (
            <div key={d.label} className="group flex h-full flex-1 flex-col items-center justify-end">
              <span className="mb-1 whitespace-nowrap text-[10px] text-ink-400 sm:text-[11px]">{format(d.value)}</span>
              <div className="w-full max-w-[44px] bg-wine/85 transition group-hover:bg-wine" style={{ height: `${Math.max(h, d.value ? 2 : 0)}%` }} />
            </div>
          );
        })}
      </div>
      <div aria-hidden className="mt-2 flex gap-2 sm:gap-4">
        {data.map((d) => (
          <span key={d.label} className="flex-1 text-center text-[11px] text-ink-400">
            {d.label}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <td>{d.label}</td>
              <td>{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
